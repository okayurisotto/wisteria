/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Redis from 'ioredis';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { MiUser } from '@/models/User.js';
import { bindThis } from '@/decorators.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { PushNotificationService } from '@/core/PushNotificationService.js';

@Injectable()
export class NotificationService {
	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		private globalEventService: GlobalEventService,
		private pushNotificationService: PushNotificationService,
	) {
	}

	@bindThis
	public async readAllNotification(
		userId: MiUser['id'],
		force = false,
	) {
		const latestReadNotificationId = await this.redisClient.get(`latestReadNotification:${userId}`);

		const latestNotificationIdsRes = await this.redisClient.xrevrange(
			`notificationTimeline:${userId}`,
			'+',
			'-',
			'COUNT', 1);
		const latestNotificationId = latestNotificationIdsRes[0]?.[0];

		if (latestNotificationId == null) return;

		this.redisClient.set(`latestReadNotification:${userId}`, latestNotificationId);

		if (force || latestReadNotificationId == null || (latestReadNotificationId < latestNotificationId)) {
			return this.postReadAllNotifications(userId);
		}
	}

	@bindThis
	private postReadAllNotifications(userId: MiUser['id']) {
		this.globalEventService.publishMainStream(userId, 'readAllNotifications');
		this.pushNotificationService.pushNotification(userId, 'readAllNotifications', undefined);
	}
}
