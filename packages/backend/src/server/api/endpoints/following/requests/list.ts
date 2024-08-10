/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import type { FollowRequestsRepository } from '@/models/_.js';
import { FollowRequestEntityService } from '@/core/entities/FollowRequestEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserLiteSchema } from '@/models/zod/user-lite.js';

export const meta = {
	tags: ['following', 'account'],

	requireCredential: true,

	kind: 'read:following',

	res: z.object({
		id: IdSchema.optional(),
		follower: UserLiteSchema.optional(),
		followee: UserLiteSchema.optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(10),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		private readonly followRequestEntityService: FollowRequestEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.followRequestsRepository.createQueryBuilder('request'), ps.sinceId, ps.untilId)
				.andWhere('request.followeeId = :meId', { meId: me.id });

			const requests = await query
				.limit(ps.limit)
				.getMany();

			return await Promise.all(requests.map(req => this.followRequestEntityService.pack(req)));
		});
	}
}
