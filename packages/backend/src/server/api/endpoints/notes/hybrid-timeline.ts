/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository, ChannelFollowingsRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import { UserFollowingService } from '@/core/UserFollowingService.js';
import { MiLocalUser } from '@/models/User.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},

	errors: {
		stlDisabled: {
			message: 'Hybrid timeline has been disabled.',
			code: 'STL_DISABLED',
			id: '620763f4-f621-4533-ab33-0577a1a3c342',
		},

		bothWithRepliesAndWithFiles: {
			message: 'Specifying both withReplies and withFiles is not supported',
			code: 'BOTH_WITH_REPLIES_AND_WITH_FILES',
			id: 'dfaa3eb7-8002-4cb7-bcc4-1095df46656f'
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
		allowPartial: { type: 'boolean', default: false }, // true is recommended but for compatibility false by default
		includeMyRenotes: { type: 'boolean', default: true },
		includeRenotedMyNotes: { type: 'boolean', default: true },
		includeLocalRenotes: { type: 'boolean', default: true },
		withFiles: { type: 'boolean', default: false },
		withRenotes: { type: 'boolean', default: true },
		withReplies: { type: 'boolean', default: false },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.channelFollowingsRepository)
		private channelFollowingsRepository: ChannelFollowingsRepository,

		private noteEntityService: NoteEntityService,
		private roleUserService: RoleUserService,
		private activeUsersChart: ActiveUsersChart,
		private idService: IdService,
		private queryService: QueryService,
		private userFollowingService: UserFollowingService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			const policies = await this.roleUserService.getUserPolicies(me.id);
			if (!policies.ltlAvailable) {
				throw new ApiError(meta.errors.stlDisabled);
			}

			if (ps.withReplies && ps.withFiles) throw new ApiError(meta.errors.bothWithRepliesAndWithFiles);

			const timeline = await this.getFromDb({
				untilId,
				sinceId,
				limit: ps.limit,
				includeMyRenotes: ps.includeMyRenotes,
				includeRenotedMyNotes: ps.includeRenotedMyNotes,
				includeLocalRenotes: ps.includeLocalRenotes,
				withFiles: ps.withFiles,
				withReplies: ps.withReplies,
			}, me);

			process.nextTick(() => {
				this.activeUsersChart.read(me);
			});

			return await this.noteEntityService.packMany(timeline, me);
		});
	}

	private async getFromDb(ps: {
		untilId: string | null,
		sinceId: string | null,
		limit: number,
		includeMyRenotes: boolean,
		includeRenotedMyNotes: boolean,
		includeLocalRenotes: boolean,
		withFiles: boolean,
		withReplies: boolean,
	}, me: MiLocalUser) {
		const followees = await this.userFollowingService.getFollowees(me.id);
		const followingChannels = await this.channelFollowingsRepository.find({
			where: {
				followerId: me.id,
			},
		});

		const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
			.andWhere(new Brackets(qb => {
				if (followees.length > 0) {
					const meOrFolloweeIds = [me.id, ...followees.map(f => f.followeeId)];
					qb.where('note.userId IN (:...meOrFolloweeIds)', { meOrFolloweeIds: meOrFolloweeIds });
					qb.orWhere('(note.visibility = \'public\') AND (note.userHost IS NULL)');
				} else {
					qb.where('note.userId = :meId', { meId: me.id });
					qb.orWhere('(note.visibility = \'public\') AND (note.userHost IS NULL)');
				}
			}))
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser');

		if (followingChannels.length > 0) {
			const followingChannelIds = followingChannels.map(x => x.followeeId);

			query.andWhere(new Brackets(qb => {
				qb.where('note.channelId IN (:...followingChannelIds)', { followingChannelIds });
				qb.orWhere('note.channelId IS NULL');
			}));
		} else {
			query.andWhere('note.channelId IS NULL');
		}

		if (!ps.withReplies) {
			query.andWhere(new Brackets(qb => {
				qb
					.where('note.replyId IS NULL') // 返信ではない
					.orWhere(new Brackets(qb => {
						qb // 返信だけど投稿者自身への返信
							.where('note.replyId IS NOT NULL')
							.andWhere('note.replyUserId = note.userId');
					}));
			}));
		}

		this.queryService.generateVisibilityQuery(query, me);
		this.queryService.generateMutedUserQuery(query, me);
		this.queryService.generateBlockedUserQuery(query, me);
		this.queryService.generateMutedUserRenotesQueryForNotes(query, me);

		if (!ps.includeMyRenotes) {
			query.andWhere(new Brackets(qb => {
				qb.orWhere('note.userId != :meId', { meId: me.id });
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (!ps.includeRenotedMyNotes) {
			query.andWhere(new Brackets(qb => {
				qb.orWhere('note.renoteUserId != :meId', { meId: me.id });
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (!ps.includeLocalRenotes) {
			query.andWhere(new Brackets(qb => {
				qb.orWhere('note.renoteUserHost IS NOT NULL');
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (ps.withFiles) {
			query.andWhere('note.fileIds != \'{}\'');
		}
		//#endregion

		return await query.limit(ps.limit).getMany();
	}
}
