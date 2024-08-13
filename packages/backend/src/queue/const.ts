/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Config } from '@/config.js';
import type * as Bull from 'bullmq';
import type { ValueOf } from 'type-fest';

export const QUEUE = {
	DELIVER: 'deliver',
	INBOX: 'inbox',
	SYSTEM: 'system',
	ENDED_POLL_NOTIFICATION: 'endedPollNotification',
	DB: 'db',
	RELATIONSHIP: 'relationship',
	OBJECT_STORAGE: 'objectStorage',
	WEBHOOK_DELIVER: 'webhookDeliver',
};

export function baseQueueOptions(config: Config, queueName: ValueOf<typeof QUEUE>): Bull.QueueOptions {
	const { keyPrefix, ...connection } = config.redisForJobQueue;

	return {
		connection,
		prefix: `${keyPrefix}queue:${queueName}`,
	};
}
