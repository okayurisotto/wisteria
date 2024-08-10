/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RenoteMutingsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { RenoteMutingEntityService } from '@/core/entities/RenoteMutingEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { RenoteMutingSchema } from '@/models/zod/renote-muting.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,

	kind: 'read:mutes',

	res: RenoteMutingSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.renoteMutingsRepository)
		private readonly renoteMutingsRepository: RenoteMutingsRepository,

		private readonly renoteMutingEntityService: RenoteMutingEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.renoteMutingsRepository.createQueryBuilder('muting'), ps.sinceId, ps.untilId)
				.andWhere('muting.muterId = :meId', { meId: me.id });

			const mutings = await query
				.limit(ps.limit)
				.getMany();

			return await this.renoteMutingEntityService.packMany(mutings, me);
		});
	}
}
