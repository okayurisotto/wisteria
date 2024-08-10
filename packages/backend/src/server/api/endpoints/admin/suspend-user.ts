/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull, Not } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository, FollowingsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { RelationshipJobData } from '@/queue/types.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { UserSuspendService } from '@/core/UserSuspendService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { QueueService } from '@/core/QueueService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:suspend-user',
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly userSuspendService: UserSuspendService,
		private readonly roleUserService: RoleUserService,
		private readonly moderationLogService: ModerationLogService,
		private readonly queueService: QueueService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({ id: ps.userId });

			if (user == null) {
				throw new Error('user not found');
			}

			if (await this.roleUserService.isModerator(user)) {
				throw new Error('cannot suspend moderator account');
			}

			await this.usersRepository.update(user.id, {
				isSuspended: true,
			});

			this.moderationLogService.log(me, 'suspend', {
				userId: user.id,
				userUsername: user.username,
				userHost: user.host,
			});

			(async () => {
				await this.userSuspendService.doPostSuspend(user).catch(() => {});
				await this.unFollowAll(user).catch(() => {});
			})();
		});
	}

	private async unFollowAll(follower: MiUser) {
		const followings = await this.followingsRepository.find({
			where: {
				followerId: follower.id,
				followeeId: Not(IsNull()),
			},
		});

		const jobs: RelationshipJobData[] = [];
		for (const following of followings) {
			if (following.followeeId && following.followerId) {
				jobs.push({
					from: { id: following.followerId },
					to: { id: following.followeeId },
					silent: true,
				});
			}
		}
		this.queueService.createUnfollowJob(jobs);
	}
}
