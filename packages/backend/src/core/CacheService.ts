/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { BlockingsRepository, FollowingsRepository, MutingsRepository, RenoteMutingsRepository, MiUserProfile, UserProfilesRepository, UsersRepository, MiFollowing } from '@/models/_.js';
import { RedisKVCache } from '@/misc/cache.js';
import type { MiUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import type { OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class CacheService implements OnApplicationShutdown {
	public userProfileCache: RedisKVCache<MiUserProfile>;
	public userMutingsCache: RedisKVCache<Set<string>>;
	public userBlockingCache: RedisKVCache<Set<string>>;
	public userBlockedCache: RedisKVCache<Set<string>>; // NOTE: 「被」Blockキャッシュ
	public renoteMutingsCache: RedisKVCache<Set<string>>;
	public userFollowingsCache: RedisKVCache<Record<string, Pick<MiFollowing, 'withReplies'> | undefined>>;

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.mutingsRepository)
		private mutingsRepository: MutingsRepository,

		@Inject(DI.blockingsRepository)
		private blockingsRepository: BlockingsRepository,

		@Inject(DI.renoteMutingsRepository)
		private renoteMutingsRepository: RenoteMutingsRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,
	) {
		this.userProfileCache = new RedisKVCache<MiUserProfile>(this.redisClient, 'userProfile', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.userProfilesRepository.findOneByOrFail({ userId: key }),
			toRedisConverter: (value) => JSON.stringify(value),
			fromRedisConverter: (value) => JSON.parse(value), // TODO: date型の考慮
		});

		this.userMutingsCache = new RedisKVCache<Set<string>>(this.redisClient, 'userMutings', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.mutingsRepository.find({ where: { muterId: key }, select: ['muteeId'] }).then(xs => new Set(xs.map(x => x.muteeId))),
			toRedisConverter: (value) => JSON.stringify(Array.from(value)),
			fromRedisConverter: (value) => new Set(JSON.parse(value)),
		});

		this.userBlockingCache = new RedisKVCache<Set<string>>(this.redisClient, 'userBlocking', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.blockingsRepository.find({ where: { blockerId: key }, select: ['blockeeId'] }).then(xs => new Set(xs.map(x => x.blockeeId))),
			toRedisConverter: (value) => JSON.stringify(Array.from(value)),
			fromRedisConverter: (value) => new Set(JSON.parse(value)),
		});

		this.userBlockedCache = new RedisKVCache<Set<string>>(this.redisClient, 'userBlocked', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.blockingsRepository.find({ where: { blockeeId: key }, select: ['blockerId'] }).then(xs => new Set(xs.map(x => x.blockerId))),
			toRedisConverter: (value) => JSON.stringify(Array.from(value)),
			fromRedisConverter: (value) => new Set(JSON.parse(value)),
		});

		this.renoteMutingsCache = new RedisKVCache<Set<string>>(this.redisClient, 'renoteMutings', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.renoteMutingsRepository.find({ where: { muterId: key }, select: ['muteeId'] }).then(xs => new Set(xs.map(x => x.muteeId))),
			toRedisConverter: (value) => JSON.stringify(Array.from(value)),
			fromRedisConverter: (value) => new Set(JSON.parse(value)),
		});

		this.userFollowingsCache = new RedisKVCache<Record<string, Pick<MiFollowing, 'withReplies'> | undefined>>(this.redisClient, 'userFollowings', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60, // 1m
			fetcher: (key) => this.followingsRepository.find({ where: { followerId: key }, select: ['followeeId', 'withReplies'] }).then(xs => {
				const obj: Record<string, Pick<MiFollowing, 'withReplies'> | undefined> = {};
				for (const x of xs) {
					obj[x.followeeId] = { withReplies: x.withReplies };
				}
				return obj;
			}),
			toRedisConverter: (value) => JSON.stringify(value),
			fromRedisConverter: (value) => JSON.parse(value),
		});

		// NOTE: チャンネルのフォロー状況キャッシュはChannelFollowingServiceで行っている

		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];
			switch (type) {
				case 'userChangeSuspendedState':
				case 'remoteUserUpdated': {
					break;
				}
				case 'userTokenRegenerated': {
					break;
				}
				case 'follow': {
					this.userFollowingsCache.delete(body.followerId);
					break;
				}
				default:
					break;
			}
		}
	}

	@bindThis
	public async findUserById(userId: MiUser['id']): Promise<MiUser> {
		return await this.usersRepository.findOneByOrFail({ id: userId });
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onMessage);
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
