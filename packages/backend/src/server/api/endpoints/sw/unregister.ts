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

	requireCredential: false,

	description: 'Unregister from receiving push notifications.',
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
			await this.swSubscriptionsRepository.delete({
				...(me ? { userId: me.id } : {}),
				endpoint: ps.endpoint,
			});
		});
	}
}
