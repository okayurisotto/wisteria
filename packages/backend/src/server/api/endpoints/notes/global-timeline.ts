/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import type { NotesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes'],

	res: NoteSchema.array(),

	errors: {
		gtlDisabled: {
			message: 'Global timeline has been disabled.',
			code: 'GTL_DISABLED',
			id: '0332fc13-6ab2-4427-ae80-a9fadffd1a6b',
		},
	},
} as const;

export const paramDef = z.object({
	withFiles: z.boolean().default(false),
	withRenotes: z.boolean().default(true),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly roleUserService: RoleUserService,
		private readonly activeUsersChart: ActiveUsersChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			const policies = await this.roleUserService.getUserPolicies(me ? me.id : null);
			if (!policies.gtlAvailable) {
				throw new ApiError(meta.errors.gtlDisabled);
			}

			// #region Construct query
			const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'),
				ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)
				.andWhere('note.visibility = \'public\'')
				.andWhere('note.channelId IS NULL')
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');

			if (me) {
				this.queryService.generateMutedUserQuery(query, me);
				this.queryService.generateBlockedUserQuery(query, me);
				this.queryService.generateMutedUserRenotesQueryForNotes(query, me);
			}

			if (ps.withFiles) {
				query.andWhere('note.fileIds != \'{}\'');
			}

			if (!ps.withRenotes) {
				query.andWhere(new Brackets((qb) => {
					qb.where('note.renoteId IS NULL');
					qb.orWhere(new Brackets((qb) => {
						qb.where('note.text IS NOT NULL');
						qb.orWhere('note.fileIds != \'{}\'');
					}));
				}));
			}
			// #endregion

			const timeline = await query.limit(ps.limit).getMany();

			process.nextTick(() => {
				if (me) {
					this.activeUsersChart.read(me);
				}
			});

			return await this.noteEntityService.packMany(timeline, me);
		});
	}
}
