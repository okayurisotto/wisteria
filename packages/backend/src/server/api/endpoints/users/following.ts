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

	description: 'Show everyone that this user is following.',

	res: FollowingSchema.array(),

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '63e4aba4-4156-4e53-be25-c9559e42d71b',
		},

		forbidden: {
			message: 'Forbidden.',
			code: 'FORBIDDEN',
			id: 'f6cdb0df-c19f-ec5c-7dbb-0ba84a1f92ba',
		},

		birthdayInvalid: {
			message: 'Birthday date format is invalid.',
			code: 'BIRTHDAY_DATE_FORMAT_INVALID',
			id: 'a2b007b9-4782-4eba-abd3-93b05ed4130d',
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
		birthday: z.string().nullable().optional(),
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

			if (profile.followingVisibility === 'private') {
				if (me == null || (me.id !== user.id)) {
					throw new ApiError(meta.errors.forbidden);
				}
			} else if (profile.followingVisibility === 'followers') {
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
				.andWhere('following.followerId = :userId', { userId: user.id })
				.innerJoinAndSelect('following.followee', 'followee');

			if (ps.birthday) {
				try {
					const d = new Date(ps.birthday);
					d.setHours(0, 0, 0, 0);
					const birthday = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
					const birthdayUserQuery = this.userProfilesRepository.createQueryBuilder('user_profile');
					birthdayUserQuery.select('user_profile.userId')
						.where(`SUBSTR(user_profile.birthday, 6, 5) = '${birthday}'`);

					query.andWhere(`following.followeeId IN (${birthdayUserQuery.getQuery()})`);
				} catch (err) {
					throw new ApiError(meta.errors.birthdayInvalid);
				}
			}

			const followings = await query
				.limit(ps.limit)
				.getMany();

			return await this.followingEntityService.packMany(followings, me, { populateFollowee: true });
		});
	}
}
