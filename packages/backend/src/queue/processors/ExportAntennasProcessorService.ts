/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { formatDateTime } from '@/misc/formatDate.js';
import { In } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { AntennasRepository, UsersRepository, UserListMembershipsRepository, MiUser } from '@/models/_.js';
import { Logger } from '@/logger.js';
import { DriveService } from '@/core/DriveService.js';
import { createTemp } from '@/misc/create-temp.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type { DBExportAntennasData } from '../types.js';
import type * as Bull from 'bullmq';
import { AcctEntity } from '@/misc/AcctEntity.js';
import type { Config } from '@/config.js';

@Injectable()
export class ExportAntennasProcessorService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.antennasRepository)
		private readonly antennsRepository: AntennasRepository,

		@Inject(DI.userListMembershipsRepository)
		private readonly userListMembershipsRepository: UserListMembershipsRepository,

		private readonly driveService: DriveService,
		private readonly queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('export-antennas');
	}

	public async process(job: Bull.Job<DBExportAntennasData>): Promise<void> {
		const user = await this.usersRepository.findOneBy({ id: job.data.user.id });
		if (user == null) {
			return;
		}
		const [path, cleanup] = await createTemp();
		const stream = fs.createWriteStream(path, { flags: 'a' });
		const write = (input: string): Promise<void> => {
			return new Promise((resolve, reject) => {
				stream.write(input, (err) => {
					if (err) {
						this.logger.error(err);
						reject();
					} else {
						resolve();
					}
				});
			});
		};
		try {
			const antennas = await this.antennsRepository.findBy({ userId: job.data.user.id });
			write('[');
			for (const [index, antenna] of antennas.entries()) {
				let users: MiUser[] | undefined;
				if (antenna.userListId !== null) {
					const memberships = await this.userListMembershipsRepository.findBy({ userListId: antenna.userListId });
					users = await this.usersRepository.findBy({
						id: In(memberships.map(j => j.userId)),
					});
				}
				write(JSON.stringify({
					name: antenna.name,
					src: antenna.src,
					keywords: antenna.keywords,
					excludeKeywords: antenna.excludeKeywords,
					users: antenna.users,
					userListAccts: typeof users !== 'undefined'
						? users.map(user => AcctEntity.from(user.username, user.host, this.config.host).toLongStringLegacy())
						: null,
					caseSensitive: antenna.caseSensitive,
					localOnly: antenna.localOnly,
					withReplies: antenna.withReplies,
					withFile: antenna.withFile,
					notify: antenna.notify,
				}));
				if (antennas.length - 1 !== index) {
					write(', ');
				}
			}
			write(']');
			stream.end();

			const fileName = 'antennas-' + formatDateTime(new Date()) + '.json';
			const driveFile = await this.driveService.addFile({ user, path, name: fileName, force: true, ext: 'json' });
			this.logger.succ('Exported to: ' + driveFile.id);
		} finally {
			cleanup();
		}
	}
}
