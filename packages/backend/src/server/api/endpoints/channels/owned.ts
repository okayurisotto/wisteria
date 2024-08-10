/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ChannelsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ChannelSchema } from '@/models/zod/channel.js';

export const meta = {
	tags: ['channels', 'account'],

	requireCredential: true,

	kind: 'read:channels',

	res: ChannelSchema.array(),
} as const;

export const paramDef = z.object({
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(5),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		private readonly channelEntityService: ChannelEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.channelsRepository.createQueryBuilder('channel'), ps.sinceId, ps.untilId)
				.andWhere('channel.isArchived = FALSE')
				.andWhere({ userId: me.id });

			const channels = await query
				.limit(ps.limit)
				.getMany();

			return await Promise.all(channels.map(x => this.channelEntityService.pack(x, me)));
		});
	}
}
