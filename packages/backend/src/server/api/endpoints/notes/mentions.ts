/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository, FollowingsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { NoteReadService } from '@/core/NoteReadService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,
	kind: 'read:account',

	res: NoteSchema.array(),
} as const;

export const paramDef = z.object({
	following: z.boolean().default(false),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	visibility: z.string().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly noteReadService: NoteReadService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const followingQuery = this.followingsRepository.createQueryBuilder('following')
				.select('following.followeeId')
				.where('following.followerId = :followerId', { followerId: me.id });

			const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
				.andWhere(new Brackets((qb) => {
					qb // このmeIdAsListパラメータはqueryServiceのgenerateVisibilityQueryでセットされる
						.where(':meIdAsList <@ note.mentions')
						.orWhere(':meIdAsList <@ note.visibleUserIds');
				}))
				// Avoid scanning primary key index
				.orderBy('CONCAT(note.id)', 'DESC')
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');

			this.queryService.generateVisibilityQuery(query, me);
			this.queryService.generateMutedUserQuery(query, me);
			this.queryService.generateMutedNoteThreadQuery(query, me);
			this.queryService.generateBlockedUserQuery(query, me);

			if (ps.visibility) {
				query.andWhere('note.visibility = :visibility', { visibility: ps.visibility });
			}

			if (ps.following) {
				query.andWhere(`((note.userId IN (${followingQuery.getQuery()})) OR (note.userId = :meId))`, { meId: me.id });
				query.setParameters(followingQuery.getParameters());
			}

			const mentions = await query.limit(ps.limit).getMany();

			this.noteReadService.read(me.id, mentions);

			return await this.noteEntityService.packMany(mentions, me);
		});
	}
}
