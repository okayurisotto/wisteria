/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository } from '@/models/_.js';
import { safeForSql } from '@/misc/safe-for-sql.js';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { UserDetailedSchema } from '@/models/zod/user.js';

export const meta = {
	requireCredential: false,

	tags: ['hashtags', 'users'],

	res: UserDetailedSchema.array(),
} as const;

export const paramDef = z.object({
	tag: z.string(),
	limit: z.number().int().min(1).max(100).default(10),
	sort: z.enum(['+follower', '-follower', '+createdAt', '-createdAt', '+updatedAt', '-updatedAt']),
	state: z.enum(['all', 'alive']).default('all'),
	origin: z.enum(['combined', 'local', 'remote']).default('local'),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!safeForSql(normalizeForSearch(ps.tag))) throw new Error('Injection');
			const query = this.usersRepository.createQueryBuilder('user')
				.where(':tag <@ user.tags', { tag: [normalizeForSearch(ps.tag)] })
				.andWhere('user.isSuspended = FALSE');

			const recent = new Date(Date.now() - (1000 * 60 * 60 * 24 * 5));

			if (ps.state === 'alive') {
				query.andWhere('user.updatedAt > :date', { date: recent });
			}

			if (ps.origin === 'local') {
				query.andWhere('user.host IS NULL');
			} else if (ps.origin === 'remote') {
				query.andWhere('user.host IS NOT NULL');
			}

			switch (ps.sort) {
				case '+follower': query.orderBy('user.followersCount', 'DESC'); break;
				case '-follower': query.orderBy('user.followersCount', 'ASC'); break;
				case '+createdAt': query.orderBy('user.id', 'DESC'); break;
				case '-createdAt': query.orderBy('user.id', 'ASC'); break;
				case '+updatedAt': query.orderBy('user.updatedAt', 'DESC'); break;
				case '-updatedAt': query.orderBy('user.updatedAt', 'ASC'); break;
			}

			const users = await query.limit(ps.limit).getMany();

			return await this.userEntityService.packMany(users, me, { schema: 'UserDetailed' });
		});
	}
}
