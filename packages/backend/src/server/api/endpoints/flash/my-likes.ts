/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { FlashLikesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { FlashLikeEntityService } from '@/core/entities/FlashLikeEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { FlashSchema } from '@/models/zod/flash.js';

export const meta = {
	tags: ['account', 'flash'],

	requireCredential: true,

	kind: 'read:flash-likes',

	res: z.object({
		id: IdSchema.optional(),
		flash: FlashSchema.optional(),
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
		@Inject(DI.flashLikesRepository)
		private readonly flashLikesRepository: FlashLikesRepository,

		private readonly flashLikeEntityService: FlashLikeEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.flashLikesRepository.createQueryBuilder('like'), ps.sinceId, ps.untilId)
				.andWhere('like.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('like.flash', 'flash');

			const likes = await query
				.limit(ps.limit)
				.getMany();

			return this.flashLikeEntityService.packMany(likes, me);
		});
	}
}
