/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { FollowingsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { FollowingEntityService } from '@/core/entities/FollowingEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { FollowingSchema } from '@/models/zod/following.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,

	res: FollowingSchema.array(),
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
		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly followingEntityService: FollowingEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.followingsRepository.createQueryBuilder('following'), ps.sinceId, ps.untilId)
				.andWhere('following.followeeHost = :host', { host: ps.host });

			const followings = await query
				.limit(ps.limit)
				.getMany();

			return await this.followingEntityService.packMany(followings, me, { populateFollowee: true });
		});
	}
}
