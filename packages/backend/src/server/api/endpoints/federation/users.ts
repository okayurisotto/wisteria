/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,

	res: UserDetailedNotMeSchema.array(),
} as const;

export const paramDef = z.object({
	host: z.string(),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(10),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.usersRepository.createQueryBuilder('user'), ps.sinceId, ps.untilId)
				.andWhere('user.host = :host', { host: ps.host });

			const users = await query
				.limit(ps.limit)
				.getMany();

			return await this.userEntityService.packMany(users, me, { schema: 'UserDetailedNotMe' });
		});
	}
}
