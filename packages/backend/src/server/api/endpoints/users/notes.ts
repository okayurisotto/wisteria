/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { BlockingsRepository, NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import type { MiLocalUser } from '@/models/User.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['users', 'notes'],

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

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
		withReplies: { type: 'boolean', default: false },
		withRenotes: { type: 'boolean', default: true },
		withChannelNotes: { type: 'boolean', default: false },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
		allowPartial: { type: 'boolean', default: false }, // true is recommended but for compatibility false by default
		withFiles: { type: 'boolean', default: false },
	},
	required: ['userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.blockingsRepository)
		private blockingsRepository: BlockingsRepository,

		private noteEntityService: NoteEntityService,
		private queryService: QueryService,
		private idService: IdService,
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
		untilId: string | null,
		sinceId: string | null,
		limit: number,
		userId: string,
		withChannelNotes: boolean,
		withFiles: boolean,
		withRenotes: boolean,
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
			if (!isSelf) query.andWhere(new Brackets(qb => {
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
			query.andWhere(new Brackets(qb => {
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
