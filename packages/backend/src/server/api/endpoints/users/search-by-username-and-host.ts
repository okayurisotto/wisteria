/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, FollowingsRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import type { MiUser } from '@/models/User.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { z } from 'zod';
import { UserSchema } from '@/models/zod/user.js';
import { UserLiteEntityService } from '@/core/entities/UserLiteEntityService.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	description: 'Search for a user by username and/or host.',

	res: UserSchema.array(),
} as const;

export const paramDef = z.object({
	username: z.string().nullable().optional(),
	host: z.string().nullable().optional(),
	limit: z.number().int().min(1).max(100).default(10),
	detail: z.boolean().default(true),
}).refine(v => v.username != null || v.host != null);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const setUsernameAndHostQuery = (query = this.usersRepository.createQueryBuilder('user')) => {
				if (ps.username) {
					query.andWhere('user.usernameLower LIKE :username', { username: sqlLikeEscape(ps.username.toLowerCase()) + '%' });
				}

				if (ps.host) {
					if (ps.host === this.config.hostname || ps.host === '.') {
						query.andWhere('user.host IS NULL');
					} else {
						query.andWhere('user.host LIKE :host', {
							host: sqlLikeEscape(ps.host.toLowerCase()) + '%',
						});
					}
				}

				return query;
			};

			const activeThreshold = new Date(Date.now() - (1000 * 60 * 60 * 24 * 30)); // 30日

			let users: MiUser[] = [];

			if (me) {
				const followingQuery = this.followingsRepository.createQueryBuilder('following')
					.select('following.followeeId')
					.where('following.followerId = :followerId', { followerId: me.id });

				const query = setUsernameAndHostQuery()
					.andWhere(`user.id IN (${followingQuery.getQuery()})`)
					.andWhere('user.id != :meId', { meId: me.id })
					.andWhere('user.isSuspended = FALSE')
					.andWhere(new Brackets((qb) => {
						qb
							.where('user.updatedAt IS NULL')
							.orWhere('user.updatedAt > :activeThreshold', { activeThreshold: activeThreshold });
					}));

				query.setParameters(followingQuery.getParameters());

				users = await query
					.orderBy('user.usernameLower', 'ASC')
					.limit(ps.limit)
					.getMany();

				if (users.length < ps.limit) {
					const otherQuery = setUsernameAndHostQuery()
						.andWhere(`user.id NOT IN (${followingQuery.getQuery()})`)
						.andWhere('user.isSuspended = FALSE')
						.andWhere('user.updatedAt IS NOT NULL');

					otherQuery.setParameters(followingQuery.getParameters());

					const otherUsers = await otherQuery
						.orderBy('user.updatedAt', 'DESC')
						.limit(ps.limit - users.length)
						.getMany();

					users = users.concat(otherUsers);
				}
			} else {
				const query = setUsernameAndHostQuery()
					.andWhere('user.isSuspended = FALSE')
					.andWhere('user.updatedAt IS NOT NULL');

				users = await query
					.orderBy('user.updatedAt', 'DESC')
					.limit(ps.limit - users.length)
					.getMany();
			}

			if (ps.detail) {
				return await this.userEntityService.packMany(users, me, { schema: 'UserDetailed' });
			} else {
				return await Promise.all(users.map(u => this.userLiteEntityService.packLite(u)));
			}
		});
	}
}
