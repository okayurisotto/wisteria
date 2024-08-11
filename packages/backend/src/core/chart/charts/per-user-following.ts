/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable, Inject } from '@nestjs/common';
import { Not, IsNull, DataSource } from 'typeorm';
import type { MiUser } from '@/models/User.js';
import { AppLockService } from '@/core/AppLockService.js';
import { DI } from '@/di-symbols.js';
import type { FollowingsRepository } from '@/models/_.js';
import Chart from '../core.js';
import { ChartLoggerService } from '../ChartLoggerService.js';
import { name, schema } from './entities/per-user-following.js';
import type { KVs } from '../core.js';
import { isLocalUser } from '@/misc/isLocalUser.js';

/**
 * ユーザーごとのフォローに関するチャート
 */
@Injectable()
export default class PerUserFollowingChart extends Chart<typeof schema> {
	constructor(
		@Inject(DI.db)
		db: DataSource,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		appLockService: AppLockService,
		chartLoggerService: ChartLoggerService,
	) {
		super(db, k => appLockService.getChartInsertLock(k), chartLoggerService.logger, name, schema, true);
	}

	protected async tickMajor(group: string): Promise<Partial<KVs<typeof schema>>> {
		const [
			localFollowingsCount,
			localFollowersCount,
			remoteFollowingsCount,
			remoteFollowersCount,
		] = await Promise.all([
			this.followingsRepository.countBy({ followerId: group, followeeHost: IsNull() }),
			this.followingsRepository.countBy({ followeeId: group, followerHost: IsNull() }),
			this.followingsRepository.countBy({ followerId: group, followeeHost: Not(IsNull()) }),
			this.followingsRepository.countBy({ followeeId: group, followerHost: Not(IsNull()) }),
		]);

		return {
			'local.followings.total': localFollowingsCount,
			'local.followers.total': localFollowersCount,
			'remote.followings.total': remoteFollowingsCount,
			'remote.followers.total': remoteFollowersCount,
		};
	}

	protected async tickMinor(): Promise<Partial<KVs<typeof schema>>> {
		return {};
	}

	public async update(follower: { id: MiUser['id']; host: MiUser['host'] }, followee: { id: MiUser['id']; host: MiUser['host'] }, isFollow: boolean): Promise<void> {
		const prefixFollower = isLocalUser(follower) ? 'local' : 'remote';
		const prefixFollowee = isLocalUser(followee) ? 'local' : 'remote';

		this.commit({
			[`${prefixFollower}.followings.total`]: isFollow ? 1 : -1,
			[`${prefixFollower}.followings.inc`]: isFollow ? 1 : 0,
			[`${prefixFollower}.followings.dec`]: isFollow ? 0 : 1,
		}, follower.id);
		this.commit({
			[`${prefixFollowee}.followers.total`]: isFollow ? 1 : -1,
			[`${prefixFollowee}.followers.inc`]: isFollow ? 1 : 0,
			[`${prefixFollowee}.followers.dec`]: isFollow ? 0 : 1,
		}, followee.id);
	}
}
