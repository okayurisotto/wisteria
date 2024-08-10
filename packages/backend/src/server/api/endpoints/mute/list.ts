/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { MutingsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { MutingEntityService } from '@/core/entities/MutingEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { MutingSchema } from '@/models/zod/muting.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,

	kind: 'read:mutes',

	res: MutingSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.mutingsRepository)
		private readonly mutingsRepository: MutingsRepository,

		private readonly mutingEntityService: MutingEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.mutingsRepository.createQueryBuilder('muting'), ps.sinceId, ps.untilId)
				.andWhere('muting.muterId = :meId', { meId: me.id });

			const mutings = await query
				.limit(ps.limit)
				.getMany();

			return await this.mutingEntityService.packMany(mutings, me);
		});
	}
}
