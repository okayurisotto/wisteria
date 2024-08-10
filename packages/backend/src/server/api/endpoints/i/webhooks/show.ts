/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { webhookEventTypes } from '@/models/Webhook.js';
import type { WebhooksRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['webhooks'],

	requireCredential: true,

	kind: 'read:account',

	errors: {
		noSuchWebhook: {
			message: 'No such webhook.',
			code: 'NO_SUCH_WEBHOOK',
			id: '50f614d9-3047-4f7e-90d8-ad6b2d5fb098',
		},
	},

	res: z.object({
		id: IdSchema.optional(),
		userId: IdSchema.optional(),
		name: z.string().optional(),
		on: z.enum(webhookEventTypes).array(),
		url: z.string().optional(),
		secret: z.string().optional(),
		active: z.boolean().optional(),
		latestSentAt: z.string()/* format: daete-time */.nullable().optional(),
		latestStatus: z.number().int().nullable().optional(),
	}),
} as const;

export const paramDef = z.object({
	webhookId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.webhooksRepository)
		private readonly webhooksRepository: WebhooksRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const webhook = await this.webhooksRepository.findOneBy({
				id: ps.webhookId,
				userId: me.id,
			});

			if (webhook == null) {
				throw new ApiError(meta.errors.noSuchWebhook);
			}

			return {
				id: webhook.id,
				userId: webhook.userId,
				name: webhook.name,
				on: webhook.on,
				url: webhook.url,
				secret: webhook.secret,
				active: webhook.active,
				latestSentAt: webhook.latestSentAt ? webhook.latestSentAt.toISOString() : null,
				latestStatus: webhook.latestStatus,
			};
		});
	}
}
