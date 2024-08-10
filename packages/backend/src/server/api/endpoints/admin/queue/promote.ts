/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { QueueService } from '@/core/QueueService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:queue',
} as const;

export const paramDef = z.object({
	type: z.enum(['deliver', 'inbox']),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly moderationLogService: ModerationLogService,
		private readonly queueService: QueueService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let delayedQueues;

			switch (ps.type) {
				case 'deliver':
					delayedQueues = await this.queueService.deliverQueue.getDelayed();
					for (let queueIndex = 0; queueIndex < delayedQueues.length; queueIndex++) {
						const queue = delayedQueues[queueIndex];
						try {
							await queue.promote();
						} catch (e) {
							if (e instanceof Error) {
								if (e.message.includes('not in a delayed state')) {
									throw e;
								}
							} else {
								throw e;
							}
						}
					}
					break;

				case 'inbox':
					delayedQueues = await this.queueService.inboxQueue.getDelayed();
					for (let queueIndex = 0; queueIndex < delayedQueues.length; queueIndex++) {
						const queue = delayedQueues[queueIndex];
						try {
							await queue.promote();
						} catch (e) {
							if (e instanceof Error) {
								if (e.message.includes('not in a delayed state')) {
									throw e;
								}
							} else {
								throw e;
							}
						}
					}
					break;
			}

			this.moderationLogService.log(me, 'promoteQueue');
		});
	}
}
