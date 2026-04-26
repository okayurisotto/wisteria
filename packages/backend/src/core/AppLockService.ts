/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { acquireDistributedLock } from 'redis-lock';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';

@Injectable()
export class AppLockService {
	constructor(
		@Inject(DI.redis)
		private readonly redisClient: Redis.Redis,
	) {
	}

	/**
	 * Get AP Object lock
	 * @param uri AP object ID
	 * @returns Unlock function
	 */
	public async getApLock(uri: string): Promise<() => void> {
		const lock = await acquireDistributedLock(
			this.redisClient,
			`ap-object:${uri}`,
			30 * 1000,
			100,
			50,
			undefined,
		);
		return lock.release;
	}
}
