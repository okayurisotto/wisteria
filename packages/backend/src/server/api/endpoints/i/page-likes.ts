/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { PageLikesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { PageLikeEntityService } from '@/core/entities/PageLikeEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { PageSchema } from '@/models/zod/page.js';

export const meta = {
	tags: ['account', 'pages'],

	requireCredential: true,

	kind: 'read:page-likes',

	res: z.object({
		id: IdSchema.optional(),
		page: PageSchema.optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.pageLikesRepository)
		private readonly pageLikesRepository: PageLikesRepository,

		private readonly pageLikeEntityService: PageLikeEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.pageLikesRepository.createQueryBuilder('like'), ps.sinceId, ps.untilId)
				.andWhere('like.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('like.page', 'page');

			const likes = await query
				.limit(ps.limit)
				.getMany();

			return this.pageLikeEntityService.packMany(likes, me);
		});
	}
}
