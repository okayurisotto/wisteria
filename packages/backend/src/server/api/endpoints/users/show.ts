/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In, IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { RemoteUserResolveService } from '@/core/RemoteUserResolveService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { ApiError } from '../../error.js';
import { ApiLoggerService } from '../../ApiLoggerService.js';
import type { FindOptionsWhere } from 'typeorm';
import type { Config } from '@/config.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { z } from 'zod';
import { UserDetailedSchema } from '@/models/zod/user.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	description: 'Show the properties of a user.',

	res: z.union([UserDetailedSchema, UserDetailedSchema.array()]),

	errors: {
		failedToResolveRemoteUser: {
			message: 'Failed to resolve remote user.',
			code: 'FAILED_TO_RESOLVE_REMOTE_USER',
			id: 'ef7b9be4-9cba-4e6f-ab41-90ed171c7d3c',
			kind: 'server',
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '4362f8dc-731f-4ad8-a694-be5a88922a24',
			httpStatusCode: 404,
		},
	},
} as const;

export const paramDef = z.intersection(
	z.union([
		z.object({
			userId: IdSchema,
			userIds: z.never().optional(),
			username: z.never().optional(),
		}),
		z.object({
			userId: z.never().optional(),
			userIds: IdSchema.array().refine(v => new Set(v).size === v.length),
			username: z.never().optional(),
		}),
		z.object({
			userId: z.never().optional(),
			userIds: z.never().optional(),
			username: z.string(),
		}),
	]),
	z.object({
		host: z.string().nullable().describe('The local host is represented with `null`.').optional(),
	}),
);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
		private readonly remoteUserResolveService: RemoteUserResolveService,
		private readonly roleUserService: RoleUserService,
		private readonly apiLoggerService: ApiLoggerService,
	) {
		super(meta, paramDef, async (ps, me, _1, _2, _3) => {
			let user;

			const isModerator = await this.roleUserService.isModerator(me);
			ps.username = ps.username?.trim();

			if (ps.userIds) {
				if (ps.userIds.length === 0) {
					return [];
				}

				const users = await this.usersRepository.findBy(isModerator
					? {
							id: In(ps.userIds),
						}
					: {
							id: In(ps.userIds),
							isSuspended: false,
						});

				// リクエストされた通りに並べ替え
				const _users: MiUser[] = [];
				for (const id of ps.userIds) {
					_users.push(users.find(x => x.id === id)!);
				}

				return await Promise.all(_users.map(u => this.userEntityService.pack(u, me, {
					schema: 'UserDetailed',
				})));
			} else {
				// Lookup user
				if (typeof ps.host === 'string' && typeof ps.username === 'string') {
					const acct = AcctEntity.from(ps.username, ps.host, this.config.host);

					user = await this.remoteUserResolveService.resolveUser(acct).catch((err: unknown) => {
						this.apiLoggerService.logger.warn(`failed to resolve remote user: ${err}`);
						throw new ApiError(meta.errors.failedToResolveRemoteUser);
					});
				} else {
					const q: FindOptionsWhere<MiUser> = ps.userId != null
						? { id: ps.userId }
						: { usernameLower: ps.username.toLowerCase(), host: IsNull() };

					user = await this.usersRepository.findOneBy(q);
				}

				if (user == null || (!isModerator && user.isSuspended)) {
					throw new ApiError(meta.errors.noSuchUser);
				}

				return await this.userEntityService.pack(user, me, {
					schema: 'UserDetailed',
				});
			}
		});
	}
}
