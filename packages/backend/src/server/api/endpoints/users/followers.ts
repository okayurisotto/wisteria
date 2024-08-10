/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, FollowingsRepository, UserProfilesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { FollowingEntityService } from '@/core/entities/FollowingEntityService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { FollowingSchema } from '@/models/zod/following.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	description: 'Show everyone that follows this user.',

	res: FollowingSchema.array(),

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '27fa5435-88ab-43de-9360-387de88727cd',
		},

		forbidden: {
			message: 'Forbidden.',
			code: 'FORBIDDEN',
			id: '3c6a84db-d619-26af-ca14-06232a21df8a',
		},
	},
} as const;

export const paramDef = z.intersection(
	z.union([
		z.object({
			userId: IdSchema,
			username: z.never().optional(),
			host: z.never().optional(),
		}),
		z.object({
			userId: z.never().optional(),
			username: z.string(),
			host: z.string().nullable().describe('The local host is represented with `null`.'),
		}),
	]),
	z.object({
		sinceId: IdSchema.optional(),
		untilId: IdSchema.optional(),
		limit: z.number().int().min(1).max(100).default(10),
	}),
);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly utilityService: UtilityService,
		private readonly followingEntityService: FollowingEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy(ps.userId != null
				? { id: ps.userId }
				: { usernameLower: ps.username!.toLowerCase(), host: this.utilityService.toPunyNullable(ps.host) ?? IsNull() });

			if (user == null) {
				throw new ApiError(meta.errors.noSuchUser);
			}

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			if (profile.followersVisibility === 'private') {
				if (me == null || (me.id !== user.id)) {
					throw new ApiError(meta.errors.forbidden);
				}
			} else if (profile.followersVisibility === 'followers') {
				if (me == null) {
					throw new ApiError(meta.errors.forbidden);
				} else if (me.id !== user.id) {
					const isFollowing = await this.followingsRepository.exists({
						where: {
							followeeId: user.id,
							followerId: me.id,
						},
					});
					if (!isFollowing) {
						throw new ApiError(meta.errors.forbidden);
					}
				}
			}

			const query = this.queryService.makePaginationQuery(this.followingsRepository.createQueryBuilder('following'), ps.sinceId, ps.untilId)
				.andWhere('following.followeeId = :userId', { userId: user.id })
				.innerJoinAndSelect('following.follower', 'follower');

			const followings = await query
				.limit(ps.limit)
				.getMany();

			return await this.followingEntityService.packMany(followings, me, { populateFollower: true });
		});
	}
}
