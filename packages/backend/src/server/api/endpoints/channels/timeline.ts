/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ChannelsRepository, NotesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import type { MiLocalUser } from '@/models/User.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes', 'channels'],

	requireCredential: false,

	res: NoteSchema.array(),

	errors: {
		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: '4d0eeeba-a02c-4c3c-9966-ef60d38d2e7f',
		},
	},
} as const;

export const paramDef = z.object({
	channelId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
	allowPartial: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		private readonly idService: IdService,
		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly activeUsersChart: ActiveUsersChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? (ps.untilDate ? this.idService.gen(ps.untilDate) : null);
			const sinceId = ps.sinceId ?? (ps.sinceDate ? this.idService.gen(ps.sinceDate) : null);

			const channel = await this.channelsRepository.findOneBy({
				id: ps.channelId,
			});

			if (channel == null) {
				throw new ApiError(meta.errors.noSuchChannel);
			}

			if (me) this.activeUsersChart.read(me);

			return await this.noteEntityService.packMany(await this.getFromDb({ untilId, sinceId, limit: ps.limit, channelId: channel.id }, me), me);
		});
	}

	private async getFromDb(ps: {
		untilId: string | null;
		sinceId: string | null;
		limit: number;
		channelId: string;
	}, me: MiLocalUser | null) {
		// #region fallback to database
		const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
			.andWhere('note.channelId = :channelId', { channelId: ps.channelId })
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.leftJoinAndSelect('note.channel', 'channel');

		if (me) {
			this.queryService.generateMutedUserQuery(query, me);
			this.queryService.generateBlockedUserQuery(query, me);
		}
		// #endregion

		return await query.limit(ps.limit).getMany();
	}
}
