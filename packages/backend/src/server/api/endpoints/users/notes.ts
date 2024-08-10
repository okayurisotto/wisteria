/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { BlockingsRepository, NotesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import type { MiLocalUser } from '@/models/User.js';
import { ApiError } from '@/server/api/error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['users', 'notes'],

	res: NoteSchema.array(),

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '27e494ba-2ac2-48e8-893b-10d4d8c2387b',
		},

		bothWithRepliesAndWithFiles: {
			message: 'Specifying both withReplies and withFiles is not supported',
			code: 'BOTH_WITH_REPLIES_AND_WITH_FILES',
			id: '91c8cb9f-36ed-46e7-9ca2-7df96ed6e222',
		},
	},
} as const;

export const paramDef = z.object({
	userId: IdSchema,
	withReplies: z.boolean().default(false),
	withRenotes: z.boolean().default(true),
	withChannelNotes: z.boolean().default(false),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
	allowPartial: z.boolean().default(false),
	withFiles: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			if (ps.withReplies && ps.withFiles) throw new ApiError(meta.errors.bothWithRepliesAndWithFiles);

			// early return if me is blocked by requesting user
			if (me != null) {
				const userIdsWhoBlockingMe = await this.blockingsRepository.find({ where: { blockeeId: me.id }, select: ['blockerId'] }).then(xs => new Set(xs.map(x => x.blockerId)));
				if (userIdsWhoBlockingMe.has(ps.userId)) {
					return [];
				}
			}

			const timeline = await this.getFromDb({
				untilId,
				sinceId,
				limit: ps.limit,
				userId: ps.userId,
				withChannelNotes: ps.withChannelNotes,
				withFiles: ps.withFiles,
				withRenotes: ps.withRenotes,
			}, me);

			return await this.noteEntityService.packMany(timeline, me);
		});
	}

	private async getFromDb(ps: {
		untilId: string | null;
		sinceId: string | null;
		limit: number;
		userId: string;
		withChannelNotes: boolean;
		withFiles: boolean;
		withRenotes: boolean;
	}, me: MiLocalUser | null) {
		const isSelf = me && (me.id === ps.userId);

		const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
			.andWhere('note.userId = :userId', { userId: ps.userId })
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('note.channel', 'channel')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser');

		if (ps.withChannelNotes) {
			if (!isSelf) query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.channelId IS NULL');
				qb.orWhere('channel.isSensitive = false');
			}));
		} else {
			query.andWhere('note.channelId IS NULL');
		}

		this.queryService.generateVisibilityQuery(query, me);
		if (me) {
			this.queryService.generateMutedUserQuery(query, me, { id: ps.userId });
			this.queryService.generateBlockedUserQuery(query, me);
		}

		if (ps.withFiles) {
			query.andWhere('note.fileIds != \'{}\'');
		}

		if (!ps.withRenotes) {
			query.andWhere(new Brackets((qb) => {
				qb.orWhere('note.userId != :userId', { userId: ps.userId });
				qb.orWhere('note.renoteId IS NULL');
				qb.orWhere('note.text IS NOT NULL');
				qb.orWhere('note.fileIds != \'{}\'');
				qb.orWhere('0 < (SELECT COUNT(*) FROM poll WHERE poll."noteId" = note.id)');
			}));
		}

		return await query.limit(ps.limit).getMany();
	}
}
