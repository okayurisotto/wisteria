/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ChannelsRepository } from '@/models/_.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ChannelSchema } from '@/models/zod/channel.js';

export const meta = {
	tags: ['channels'],

	requireCredential: false,

	res: ChannelSchema,

	errors: {
		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: '6f6c314b-7486-4897-8966-c04a66a02923',
		},
	},
} as const;

export const paramDef = z.object({
	channelId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		private readonly channelEntityService: ChannelEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const channel = await this.channelsRepository.findOneBy({
				id: ps.channelId,
			});

			if (channel == null) {
				throw new ApiError(meta.errors.noSuchChannel);
			}

			return await this.channelEntityService.pack(channel, me, true);
		});
	}
}
