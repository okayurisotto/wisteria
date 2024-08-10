/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import type { MiLocalUser } from '@/models/User.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes'],

	res: NoteSchema.array(),

	errors: {
		ltlDisabled: {
			message: 'Local timeline has been disabled.',
			code: 'LTL_DISABLED',
			id: '45a6eb02-7695-4393-b023-dd3be9aaaefd',
		},

		bothWithRepliesAndWithFiles: {
			message: 'Specifying both withReplies and withFiles is not supported',
			code: 'BOTH_WITH_REPLIES_AND_WITH_FILES',
			id: 'dd9c8400-1cb5-4eef-8a31-200c5f933793',
		},
	},
} as const;

export const paramDef = z.object({
	withFiles: z.boolean().default(false),
	withRenotes: z.boolean().default(true),
	withReplies: z.boolean().default(false),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	allowPartial: z.boolean().default(false),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly roleUserService: RoleUserService,
		private readonly activeUsersChart: ActiveUsersChart,
		private readonly idService: IdService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			const policies = await this.roleUserService.getUserPolicies(me ? me.id : null);
			if (!policies.ltlAvailable) {
				throw new ApiError(meta.errors.ltlDisabled);
			}

			if (ps.withReplies && ps.withFiles) throw new ApiError(meta.errors.bothWithRepliesAndWithFiles);

			const timeline = await this.getFromDb({
				untilId,
				sinceId,
				limit: ps.limit,
				withFiles: ps.withFiles,
				withReplies: ps.withReplies,
			}, me);

			process.nextTick(() => {
				if (me) {
					this.activeUsersChart.read(me);
				}
			});

			return await this.noteEntityService.packMany(timeline, me);
		});
	}

	private async getFromDb(ps: {
		sinceId: string | null;
		untilId: string | null;
		limit: number;
		withFiles: boolean;
		withReplies: boolean;
	}, me: MiLocalUser | null) {
		const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'),
			ps.sinceId, ps.untilId)
			.andWhere('(note.visibility = \'public\') AND (note.userHost IS NULL) AND (note.channelId IS NULL)')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser');

		this.queryService.generateVisibilityQuery(query, me);
		if (me) this.queryService.generateMutedUserQuery(query, me);
		if (me) this.queryService.generateBlockedUserQuery(query, me);
		if (me) this.queryService.generateMutedUserRenotesQueryForNotes(query, me);

		if (ps.withFiles) {
			query.andWhere('note.fileIds != \'{}\'');
		}

		if (!ps.withReplies) {
			query.andWhere(new Brackets((qb) => {
				qb
					.where('note.replyId IS NULL') // 返信ではない
					.orWhere(new Brackets((qb) => {
						qb // 返信だけど投稿者自身への返信
							.where('note.replyId IS NOT NULL')
							.andWhere('note.replyUserId = note.userId');
					}));
			}));
		}

		return await query.limit(ps.limit).getMany();
	}
}
