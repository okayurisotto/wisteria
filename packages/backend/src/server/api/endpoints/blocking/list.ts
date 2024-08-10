/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { BlockingsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { BlockingEntityService } from '@/core/entities/BlockingEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { BlockingSchema } from '@/models/zod/blocking.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,

	kind: 'read:blocks',

	res: BlockingSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		private readonly blockingEntityService: BlockingEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.blockingsRepository.createQueryBuilder('blocking'), ps.sinceId, ps.untilId)
				.andWhere('blocking.blockerId = :meId', { meId: me.id });

			const blockings = await query
				.limit(ps.limit)
				.getMany();

			return await this.blockingEntityService.packMany(blockings, me);
		});
	}
}
