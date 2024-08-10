/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { NotesRepository, RolesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { IdService } from '@/core/IdService.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['role', 'notes'],

	requireCredential: true,
	kind: 'read:account',

	errors: {
		noSuchRole: {
			message: 'No such role.',
			code: 'NO_SUCH_ROLE',
			id: 'eb70323a-df61-4dd4-ad90-89c83c7cf26e',
		},
	},

	res: NoteSchema.array(),
} as const;

export const paramDef = z.object({
	roleId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.redisForTimelines)
		private readonly redisForTimelines: Redis.Redis,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.rolesRepository)
		private readonly rolesRepository: RolesRepository,

		private readonly idService: IdService,
		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly fanoutTimelineService: FanoutTimelineService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			const role = await this.rolesRepository.findOneBy({
				id: ps.roleId,
				isPublic: true,
			});

			if (role == null) {
				throw new ApiError(meta.errors.noSuchRole);
			}
			if (!role.isExplorable) {
				return [];
			}

			let noteIds = await this.fanoutTimelineService.get(`roleTimeline:${role.id}`, untilId, sinceId);
			noteIds = noteIds.slice(0, ps.limit);

			if (noteIds.length === 0) {
				return [];
			}

			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.id IN (:...noteIds)', { noteIds: noteIds })
				.andWhere('(note.visibility = \'public\')')
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');

			this.queryService.generateVisibilityQuery(query, me);
			this.queryService.generateMutedUserQuery(query, me);
			this.queryService.generateBlockedUserQuery(query, me);

			const notes = await query.getMany();
			notes.sort((a, b) => a.id > b.id ? -1 : 1);

			return await this.noteEntityService.packMany(notes, me);
		});
	}
}
