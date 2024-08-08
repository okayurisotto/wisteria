/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import type { MiUserList, NotesRepository, UserListMembershipsRepository, UserListsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import type { MiLocalUser } from '@/models/User.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes', 'lists'],

	requireCredential: true,
	kind: 'read:account',

	res: NoteSchema.array(),

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '8fb1fbd5-e476-4c37-9fb0-43d55b63a2ff',
		},
	},
} as const;

export const paramDef = z.object({
	listId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
	allowPartial: z.boolean().default(false),
	includeMyRenotes: z.boolean().default(true),
	includeRenotedMyNotes: z.boolean().default(true),
	includeLocalRenotes: z.boolean().default(true),
	withRenotes: z.boolean().default(true),
	withFiles: z.boolean().default(false).describe('Only show notes that have attached files.'),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		@Inject(DI.userListMembershipsRepository)
		private readonly userListMembershipsRepository: UserListMembershipsRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly idService: IdService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			const list = await this.userListsRepository.findOneBy({
				id: ps.listId,
				userId: me.id,
			});

			if (list == null) {
				throw new ApiError(meta.errors.noSuchList);
			}

			const timeline = await this.getFromDb(list, {
				untilId,
				sinceId,
				limit: ps.limit,
				includeMyRenotes: ps.includeMyRenotes,
				includeRenotedMyNotes: ps.includeRenotedMyNotes,
				includeLocalRenotes: ps.includeLocalRenotes,
				withFiles: ps.withFiles,
				withRenotes: ps.withRenotes,
			}, me);

			return await this.noteEntityService.packMany(timeline, me);
		});
	}

	private async getFromDb(list: MiUserList, ps: {
		untilId: string | null;
		sinceId: string | null;
		limit: number;
		includeMyRenotes: boolean;
		includeRenotedMyNotes: boolean;
		includeLocalRenotes: boolean;
		withFiles: boolean;
		withRenotes: boolean;
	}, me: MiLocalUser) {
		// #region Construct query
		const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
			.innerJoin(this.userListMembershipsRepository.metadata.targetName, 'userListMemberships', 'userListMemberships.userId = note.userId')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.andWhere('userListMemberships.userListId = :userListId', { userListId: list.id })
			.andWhere('note.channelId IS NULL') // チャンネルノートではない
			.andWhere(new Brackets((qb) => {
				qb
					.where('note.replyId IS NULL') // 返信ではない
					.orWhere(new Brackets((qb) => {
						qb // 返信だけど投稿者自身への返信
							.where('note.replyId IS NOT NULL')
							.andWhere('note.replyUserId = note.userId');
					}))
					.orWhere(new Brackets((qb) => {
						qb // 返信だけど自分宛ての返信
							.where('note.replyId IS NOT NULL')
							.andWhere('note.replyUserId = :meId', { meId: me.id });
					}))
					.orWhere(new Brackets((qb) => {
						qb // 返信だけどwithRepliesがtrueの場合
							.where('note.replyId IS NOT NULL')
							.andWhere('userListMemberships.withReplies = true');
					}));
			}));

		this.queryService.generateVisibilityQuery(query, me);
		this.queryService.generateMutedUserQuery(query, me);
		this.queryService.generateBlockedUserQuery(query, me);
		this.queryService.generateMutedUserRenotesQueryForNotes(query, me);

		if (!ps.includeMyRenotes) {
			query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.userId != :meId', { meId: me.id });
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (!ps.includeRenotedMyNotes) {
			query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.renoteUserId != :meId', { meId: me.id });
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (!ps.includeLocalRenotes) {
			query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.renoteUserHost IS NOT NULL');
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		if (!ps.withRenotes) {
			query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere(new Brackets((qb) => {
					qb.orWhere('note.text IS NOT NULL');
					qb.orWhere('note.fileIds != \'{}\'');
				}));
			}));
		}

		if (ps.withFiles) {
			query.andWhere('note.fileIds != \'{}\'');
		}
		// #endregion

		return await query.limit(ps.limit).getMany();
	}
}
