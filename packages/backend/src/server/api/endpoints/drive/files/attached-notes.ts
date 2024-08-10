/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { NotesRepository, DriveFilesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['drive', 'notes'],

	requireCredential: true,

	kind: 'read:drive',

	description: 'Find the notes to which the given file is attached.',

	res: NoteSchema.array(),

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'c118ece3-2e4b-4296-99d1-51756e32d232',
		},
	},
} as const;

export const paramDef = z.object({
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(10),
	fileId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Fetch file
			const file = await this.driveFilesRepository.findOneBy({
				id: ps.fileId,
				userId: me.id,
			});

			if (file == null) {
				throw new ApiError(meta.errors.noSuchFile);
			}

			const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId);
			query.andWhere(':file <@ note.fileIds', { file: [file.id] });

			const notes = await query.limit(ps.limit).getMany();

			return await this.noteEntityService.packMany(notes, me, {
				detail: true,
			});
		});
	}
}
