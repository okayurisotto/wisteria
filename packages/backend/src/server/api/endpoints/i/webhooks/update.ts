/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { WebhooksRepository } from '@/models/_.js';
import { webhookEventTypes } from '@/models/Webhook.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['webhooks'],

	requireCredential: true,

	kind: 'write:account',

	errors: {
		noSuchWebhook: {
			message: 'No such webhook.',
			code: 'NO_SUCH_WEBHOOK',
			id: 'fb0fea69-da18-45b1-828d-bd4fd1612518',
		},
	},

} as const;

export const paramDef = z.object({
	webhookId: IdSchema,
	name: z.string().min(1).max(100),
	url: z.string().min(1).max(1024),
	secret: z.string().max(1024).default(''),
	on: z.enum(webhookEventTypes).array(),
	active: z.boolean(),
});

// TODO: ロジックをサービスに切り出す

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.webhooksRepository)
		private readonly webhooksRepository: WebhooksRepository,

		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const webhook = await this.webhooksRepository.findOneBy({
				id: ps.webhookId,
				userId: me.id,
			});

			if (webhook == null) {
				throw new ApiError(meta.errors.noSuchWebhook);
			}

			await this.webhooksRepository.update(webhook.id, {
				name: ps.name,
				url: ps.url,
				secret: ps.secret,
				on: ps.on,
				active: ps.active,
			});

			const updated = await this.webhooksRepository.findOneByOrFail({
				id: ps.webhookId,
			});

			this.globalEventService.publishInternalEvent('webhookUpdated', updated);
		});
	}
}
