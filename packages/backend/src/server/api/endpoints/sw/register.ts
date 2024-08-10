/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IdService } from '@/core/IdService.js';
import type { SwSubscriptionsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { MetaService } from '@/core/MetaService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['account'],

	requireCredential: true,
	secure: true,

	description: 'Register to receive push notifications.',

	res: z.object({
		state: z.enum(['already-subscribed', 'subscribed']).optional(),
		key: z.string().nullable().optional(),
		userId: z.string().optional(),
		endpoint: z.string().optional(),
		sendReadMessage: z.boolean().optional(),
	}),
} as const;

export const paramDef = z.object({
	endpoint: z.string(),
	auth: z.string(),
	publickey: z.string(),
	sendReadMessage: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.swSubscriptionsRepository)
		private readonly swSubscriptionsRepository: SwSubscriptionsRepository,

		private readonly idService: IdService,
		private readonly metaService: MetaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// if already subscribed
			const exist = await this.swSubscriptionsRepository.findOneBy({
				userId: me.id,
				endpoint: ps.endpoint,
				auth: ps.auth,
				publickey: ps.publickey,
			});

			const instance = await this.metaService.fetch();

			if (exist != null) {
				return {
					state: 'already-subscribed' as const,
					key: instance.swPublicKey,
					userId: me.id,
					endpoint: exist.endpoint,
					sendReadMessage: exist.sendReadMessage,
				};
			}

			await this.swSubscriptionsRepository.insert({
				id: this.idService.gen(),
				userId: me.id,
				endpoint: ps.endpoint,
				auth: ps.auth,
				publickey: ps.publickey,
				sendReadMessage: ps.sendReadMessage,
			});

			return {
				state: 'subscribed' as const,
				key: instance.swPublicKey,
				userId: me.id,
				endpoint: ps.endpoint,
				sendReadMessage: ps.sendReadMessage,
			};
		});
	}
}
