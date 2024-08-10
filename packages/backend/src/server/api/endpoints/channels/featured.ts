/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ChannelsRepository } from '@/models/_.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { ChannelSchema } from '@/models/zod/channel.js';

export const meta = {
	tags: ['channels'],

	requireCredential: false,

	res: ChannelSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		private readonly channelEntityService: ChannelEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.channelsRepository.createQueryBuilder('channel')
				.where('channel.lastNotedAt IS NOT NULL')
				.andWhere('channel.isArchived = FALSE')
				.orderBy('channel.lastNotedAt', 'DESC');

			const channels = await query.limit(10).getMany();

			return await Promise.all(channels.map(x => this.channelEntityService.pack(x, me)));
		});
	}
}
