/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as ms from '@/misc/ms.js';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { FollowingsRepository } from '@/models/_.js';
import { UserFollowingService } from '@/core/UserFollowingService.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserLiteSchema } from '@/models/zod/user-lite.js';
import { UserLiteEntityService } from '@/core/entities/UserLiteEntityService.js';

export const meta = {
	tags: ['following', 'users'],

	limit: {
		duration: ms.hours(1),
		max: 100,
	},

	requireCredential: true,

	kind: 'write:following',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '5b12c78d-2b28-4dca-99d2-f56139b42ff8',
		},

		followeeIsYourself: {
			message: 'Followee is yourself.',
			code: 'FOLLOWEE_IS_YOURSELF',
			id: 'd9e400b9-36b0-4808-b1d8-79e707f1296c',
		},

		notFollowing: {
			message: 'You are not following that user.',
			code: 'NOT_FOLLOWING',
			id: '5dbf82f5-c92b-40b1-87d1-6c8c0741fd09',
		},
	},

	res: UserLiteSchema,
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly getterService: GetterService,
		private readonly userFollowingService: UserFollowingService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const follower = me;

			// Check if the followee is yourself
			if (me.id === ps.userId) {
				throw new ApiError(meta.errors.followeeIsYourself);
			}

			// Get followee
			const followee = await this.getterService.getUser(ps.userId).catch((err: unknown) => {
				if (err.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
				throw err;
			});

			// Check not following
			const exist = await this.followingsRepository.exists({
				where: {
					followerId: follower.id,
					followeeId: followee.id,
				},
			});

			if (!exist) {
				throw new ApiError(meta.errors.notFollowing);
			}

			await this.userFollowingService.unfollow(follower, followee);

			return await this.userLiteEntityService.packLite(followee.id);
		});
	}
}
