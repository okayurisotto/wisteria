/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Global, Inject, Module } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { DI } from './di-symbols.js';
import { type Config, loadConfig } from './config.js';
import { createPostgresDataSource } from './postgres.js';
import { RepositoryModule } from './models/RepositoryModule.js';
import { allSettled } from './misc/promise-tracker.js';
import type { Provider, OnApplicationShutdown } from '@nestjs/common';

const $config: Provider = {
	provide: DI.config,
	useValue: loadConfig(),
};

const $db: Provider = {
	provide: DI.db,
	useFactory: async (config: Config) => {
		const db = createPostgresDataSource(config);
		return await db.initialize();
	},
	inject: [DI.config],
};

const $redis: Provider<Redis.Redis> = {
	provide: DI.redis,
	useFactory: async (config: Config) => {
		return await new Promise<Redis.Redis>((resolve, reject) => {
			const redis = new Redis.Redis(config.redis);

			redis.on('ready', () => {
				resolve(redis);
			});

			redis.on('error', (e) => {
				console.error(e);
				reject(e);
			});
		});
	},
	inject: [DI.config],
};

const $redisForPub: Provider<Redis.Redis> = {
	provide: DI.redisForPub,
	useFactory: async (config: Config) => {
		return await new Promise<Redis.Redis>((resolve, reject) => {
			const redis = new Redis.Redis(config.redisForPubsub);

			redis.on('ready', () => {
				resolve(redis);
			});

			redis.on('error', (e) => {
				console.error(e);
				reject(e);
			});
		});
	},
	inject: [DI.config],
};

const $redisForSub: Provider<Redis.Redis> = {
	provide: DI.redisForSub,
	useFactory: async (config: Config) => {
		return await new Promise<Redis.Redis>((resolve, reject) => {
			const redis = new Redis.Redis(config.redisForPubsub);
			redis.subscribe(config.host);

			redis.on('ready', () => {
				resolve(redis);
			});

			redis.on('error', (e) => {
				console.error(e);
				reject(e);
			});
		});
	},
	inject: [DI.config],
};

const $redisForTimelines: Provider<Redis.Redis> = {
	provide: DI.redisForTimelines,
	useFactory: async (config: Config) => {
		return await new Promise<Redis.Redis>((resolve, reject) => {
			const redis = new Redis.Redis(config.redisForTimelines);

			redis.on('ready', () => {
				resolve(redis);
			});

			redis.on('error', (e) => {
				console.error(e);
				reject(e);
			});
		});
	},
	inject: [DI.config],
};

@Global()
@Module({
	imports: [RepositoryModule],
	providers: [$config, $db, $redis, $redisForPub, $redisForSub, $redisForTimelines],
	exports: [$config, $db, $redis, $redisForPub, $redisForSub, $redisForTimelines, RepositoryModule],
})
export class GlobalModule implements OnApplicationShutdown {
	constructor(
		@Inject(DI.db) private readonly db: DataSource,
		@Inject(DI.redis) private readonly redisClient: Redis.Redis,
		@Inject(DI.redisForPub) private readonly redisForPub: Redis.Redis,
		@Inject(DI.redisForSub) private readonly redisForSub: Redis.Redis,
		@Inject(DI.redisForTimelines) private readonly redisForTimelines: Redis.Redis,
	) {}

	public async dispose(): Promise<void> {
		// Wait for all potential DB queries
		await allSettled();
		// And then disconnect from DB
		await Promise.all([
			this.db.destroy(),
			this.redisClient.disconnect(),
			this.redisForPub.disconnect(),
			this.redisForSub.disconnect(),
			this.redisForTimelines.disconnect(),
		]);
	}

	async onApplicationShutdown(): Promise<void> {
		await this.dispose();
	}
}
