/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { SwSubscriptionsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['account'],

	requireCredential: true,
	secure: true,

	description: 'Check push notification registration exists.',

	res: z.object({
		userId: z.string().optional(),
		endpoint: z.string().optional(),
		sendReadMessage: z.boolean().optional(),
	}).nullable(),
} as const;

export const paramDef = z.object({
	endpoint: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.swSubscriptionsRepository)
		private readonly swSubscriptionsRepository: SwSubscriptionsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			// if already subscribed
			const exist = await this.swSubscriptionsRepository.findOneBy({
				userId: me.id,
				endpoint: ps.endpoint,
			});

			if (exist != null) {
				return {
					userId: exist.userId,
					endpoint: exist.endpoint,
					sendReadMessage: exist.sendReadMessage,
				};
			}

			return null;
		});
	}
}
