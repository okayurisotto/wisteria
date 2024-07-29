/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { setTimeout } from 'node:timers/promises';
import * as Redis from 'ioredis';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { MiUser } from '@/models/User.js';
import type { MiNotification } from '@/models/Notification.js';
import { bindThis } from '@/decorators.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { PushNotificationService } from '@/core/PushNotificationService.js';
import { NotificationEntityService } from '@/core/entities/NotificationEntityService.js';
import { IdService } from '@/core/IdService.js';
import type { Config } from '@/config.js';
import type { FilterUnionByProperty } from '@/types.js';
import { trackPromise } from '@/misc/promise-tracker.js';
import type { FollowingsRepository, MutingsRepository, UserListMembershipsRepository, UserProfilesRepository } from '@/models/_.js';

@Injectable()
export class NotificationCreateService implements OnApplicationShutdown {
	private readonly shutdownController = new AbortController();

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.mutingsRepository)
		private mutingsRepository: MutingsRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		@Inject(DI.userListMembershipsRepository)
		private userListMembershipsRepository: UserListMembershipsRepository,

		private notificationEntityService: NotificationEntityService,
		private idService: IdService,
		private globalEventService: GlobalEventService,
		private pushNotificationService: PushNotificationService,
	) {}

	@bindThis
	public createNotification<T extends MiNotification['type']>(
		notifieeId: MiUser['id'],
		type: T,
		data: Omit<FilterUnionByProperty<MiNotification, 'type', T>, 'type' | 'id' | 'createdAt' | 'notifierId'>,
		notifierId?: MiUser['id'] | null,
	) {
		trackPromise(
			this.createNotificationInternal(notifieeId, type, data, notifierId),
		);
	}

	private async createNotificationInternal<T extends MiNotification['type']>(
		notifieeId: MiUser['id'],
		type: T,
		data: Omit<FilterUnionByProperty<MiNotification, 'type', T>, 'type' | 'id' | 'createdAt' | 'notifierId'>,
		notifierId?: MiUser['id'] | null,
	): Promise<MiNotification | null> {
		const profile = await this.userProfilesRepository.findOneByOrFail({ userId: notifieeId });

		// 古いMisskeyバージョンのキャッシュが残っている可能性がある
		const recieveConfig = (profile.notificationRecieveConfig ?? {})[type];
		if (recieveConfig?.type === 'never') {
			return null;
		}

		if (notifierId) {
			if (notifieeId === notifierId) {
				return null;
			}

			const mutings = await this.mutingsRepository.find({ where: { muterId: notifieeId }, select: ['muteeId'] });
			if (mutings.map((muting) => muting.id).includes(notifierId)) {
				return null;
			}

			if (recieveConfig?.type === 'following') {
				const isFollowing = await this.followingsRepository.existsBy({
					followerId: notifieeId,
					followeeId: notifierId,
				});
				if (!isFollowing) return null;
			} else if (recieveConfig?.type === 'follower') {
				const isFollower = await this.followingsRepository.existsBy({
					followerId: notifierId,
					followeeId: notifieeId,
				});
				if (!isFollower) return null;
			} else if (recieveConfig?.type === 'mutualFollow') {
				const [isFollowing, isFollower] = await Promise.all([
					this.followingsRepository.existsBy({
						followerId: notifieeId,
						followeeId: notifierId,
					}),
					this.followingsRepository.existsBy({
						followerId: notifierId,
						followeeId: notifieeId,
					}),
				]);
				if (!isFollowing && !isFollower) return null;
			} else if (recieveConfig?.type === 'list') {
				const isMember = await this.userListMembershipsRepository.existsBy({
					userListId: recieveConfig.userListId, userId: notifierId,
				});
				if (!isMember) return null;
			}
		}

		const notification = {
			id: this.idService.gen(),
			createdAt: new Date(),
			type: type,
			...(notifierId ? {
				notifierId,
			} : {}),
			...data,
		} as any as FilterUnionByProperty<MiNotification, 'type', T>;

		const redisIdPromise = this.redisClient.xadd(
			`notificationTimeline:${notifieeId}`,
			'MAXLEN', '~', this.config.perUserNotificationsMaxCount.toString(),
			'*',
			'data', JSON.stringify(notification));

		const packed = await this.notificationEntityService.pack(notification, notifieeId, {});

		// Publish notification event
		this.globalEventService.publishMainStream(notifieeId, 'notification', packed);

		// 2秒経っても(今回作成した)通知が既読にならなかったら「未読の通知がありますよ」イベントを発行する
		// テスト通知の場合は即時発行
		const interval = notification.type === 'test' ? 0 : 2000;
		setTimeout(interval, 'unread notification', { signal: this.shutdownController.signal }).then(async () => {
			const latestReadNotificationId = await this.redisClient.get(`latestReadNotification:${notifieeId}`);
			if (latestReadNotificationId && (latestReadNotificationId >= (await redisIdPromise)!)) return;

			this.globalEventService.publishMainStream(notifieeId, 'unreadNotification', packed);
			this.pushNotificationService.pushNotification(notifieeId, 'notification', packed);
		}, () => { /* aborted, ignore it */ });

		return notification;
	}

	@bindThis
	public dispose(): void {
		this.shutdownController.abort();
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
