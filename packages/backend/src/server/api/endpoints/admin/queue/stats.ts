/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DbQueue, DeliverQueue, EndedPollNotificationQueue, InboxQueue, ObjectStorageQueue, SystemQueue, WebhookDeliverQueue } from '@/core/QueueModule.js';
import { z } from 'zod';
import { QueueCountSchema } from '@/models/zod/queue.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:emoji',

	res: z.object({
		deliver: QueueCountSchema.optional(),
		inbox: QueueCountSchema.optional(),
		db: QueueCountSchema.optional(),
		objectStorage: QueueCountSchema.optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('queue:system') public systemQueue: SystemQueue,
		@Inject('queue:endedPollNotification') public endedPollNotificationQueue: EndedPollNotificationQueue,
		@Inject('queue:deliver') public deliverQueue: DeliverQueue,
		@Inject('queue:inbox') public inboxQueue: InboxQueue,
		@Inject('queue:db') public dbQueue: DbQueue,
		@Inject('queue:objectStorage') public objectStorageQueue: ObjectStorageQueue,
		@Inject('queue:webhookDeliver') public webhookDeliverQueue: WebhookDeliverQueue,
	) {
		super(meta, paramDef, async () => {
			const deliverJobCounts = await this.deliverQueue.getJobCounts();
			const inboxJobCounts = await this.inboxQueue.getJobCounts();
			const dbJobCounts = await this.dbQueue.getJobCounts();
			const objectStorageJobCounts = await this.objectStorageQueue.getJobCounts();

			return {
				deliver: deliverJobCounts,
				inbox: inboxJobCounts,
				db: dbJobCounts,
				objectStorage: objectStorageJobCounts,
			};
		});
	}
}
