/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { IdService } from '@/core/IdService.js';
import type { WebhooksRepository } from '@/models/_.js';
import { webhookEventTypes } from '@/models/Webhook.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { ApiError } from '@/server/api/error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['webhooks'],

	requireCredential: true,

	kind: 'write:account',

	errors: {
		tooManyWebhooks: {
			message: 'You cannot create webhook any more.',
			code: 'TOO_MANY_WEBHOOKS',
			id: '87a9bb19-111e-4e37-81d3-a3e7426453b0',
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
	name: z.string().min(1).max(100),
	url: z.string().min(1).max(1024),
	secret: z.string().max(1024).default(''),
	on: z.enum(webhookEventTypes).array(),
});

// TODO: ロジックをサービスに切り出す

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.webhooksRepository)
		private readonly webhooksRepository: WebhooksRepository,

		private readonly idService: IdService,
		private readonly globalEventService: GlobalEventService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const currentWebhooksCount = await this.webhooksRepository.countBy({
				userId: me.id,
			});
			if (currentWebhooksCount > (await this.roleUserService.getUserPolicies(me.id)).webhookLimit) {
				throw new ApiError(meta.errors.tooManyWebhooks);
			}

			const webhook = await this.webhooksRepository.insert({
				id: this.idService.gen(),
				userId: me.id,
				name: ps.name,
				url: ps.url,
				secret: ps.secret,
				on: ps.on,
			}).then(x => this.webhooksRepository.findOneByOrFail(x.identifiers[0]));

			this.globalEventService.publishInternalEvent('webhookCreated', webhook);

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
