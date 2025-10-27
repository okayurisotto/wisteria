/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { formatDateTime } from '@/misc/formatDate.js';
import { DI } from '@/di-symbols.js';
import type { NotesRepository, PollsRepository, UsersRepository } from '@/models/_.js';
import type { Logger } from '@/logger.js';
import { DriveService } from '@/core/DriveService.js';
import { createTemp } from '@/misc/create-temp.js';
import type { MiPoll } from '@/models/Poll.js';
import type { MiNote } from '@/models/Note.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { IdService } from '@/core/IdService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { DbJobDataWithUser } from '../types.js';
import type { z } from 'zod';
import type { DriveFileSchema } from '@/models/zod/drive-file.js';

@Injectable()
export class ExportNotesProcessorService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.pollsRepository)
		private readonly pollsRepository: PollsRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly driveService: DriveService,
		private readonly queueLoggerService: QueueLoggerService,
		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly idService: IdService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('export-notes');
	}

	public async process(job: Bull.Job<DbJobDataWithUser>): Promise<void> {
		this.logger.info(`Exporting notes of ${job.data.user.id} ...`);

		const user = await this.usersRepository.findOneBy({ id: job.data.user.id });
		if (user == null) {
			return;
		}

		// Create temp file
		const [path, cleanup] = await createTemp();

		this.logger.info(`Temp file is ${path}`);

		try {
			const stream = fs.createWriteStream(path, { flags: 'a' });

			const write = (text: string): Promise<void> => {
				return new Promise<void>((res, rej) => {
					stream.write(text, (err) => {
						if (err) {
							this.logger.error(err);
							rej(err);
						} else {
							res();
						}
					});
				});
			};

			await write('[');

			let exportedNotesCount = 0;
			let cursor: MiNote['id'] | null = null;

			while (true) {
				const notes = await this.notesRepository.find({
					where: {
						userId: user.id,
						...(cursor ? { id: MoreThan(cursor) } : {}),
					},
					take: 100,
					order: {
						id: 1,
					},
				});

				if (notes.length === 0) {
					job.updateProgress(100);
					break;
				}

				cursor = notes.at(-1)?.id ?? null;

				for (const note of notes) {
					let poll: MiPoll | undefined;
					if (note.hasPoll) {
						poll = await this.pollsRepository.findOneByOrFail({ noteId: note.id });
					}
					const files = await this.driveFileEntityService.packManyByIds(note.fileIds);
					const content = JSON.stringify(this.serialize(note, poll, files));
					const isFirst = exportedNotesCount === 0;
					await write(isFirst ? content : ',\n' + content);
					exportedNotesCount++;
				}

				const total = await this.notesRepository.countBy({
					userId: user.id,
				});

				job.updateProgress(exportedNotesCount / total);
			}

			await write(']');

			stream.end();
			this.logger.succ(`Exported to: ${path}`);

			const fileName = 'notes-' + formatDateTime(new Date()) + '.json';
			const driveFile = await this.driveService.addFile({ user, path, name: fileName, force: true, ext: 'json' });

			this.logger.succ(`Exported to: ${driveFile.id}`);
		} finally {
			cleanup();
		}
	}

	private serialize(note: MiNote, poll: MiPoll | null = null, files: z.infer<typeof DriveFileSchema>[]): Record<string, unknown> {
		return {
			id: note.id,
			text: note.text,
			createdAt: this.idService.parse(note.id).date.toISOString(),
			fileIds: note.fileIds,
			files: files,
			replyId: note.replyId,
			renoteId: note.renoteId,
			poll: poll,
			cw: note.cw,
			visibility: note.visibility,
			visibleUserIds: note.visibleUserIds,
			localOnly: note.localOnly,
			reactionAcceptance: note.reactionAcceptance,
		};
	}
}
