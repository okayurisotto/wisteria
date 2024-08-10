/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { webhookEventTypes } from '@/models/Webhook.js';
import type { WebhooksRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['webhooks', 'account'],

	requireCredential: true,

	kind: 'read:account',

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
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.webhooksRepository)
		private readonly webhooksRepository: WebhooksRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const webhooks = await this.webhooksRepository.findBy({
				userId: me.id,
			});

			return webhooks.map(webhook => (
				{
					id: webhook.id,
					userId: webhook.userId,
					name: webhook.name,
					on: webhook.on,
					url: webhook.url,
					secret: webhook.secret,
					active: webhook.active,
					latestSentAt: webhook.latestSentAt ? webhook.latestSentAt.toISOString() : null,
					latestStatus: webhook.latestStatus,
				}
			));
		});
	}
}
