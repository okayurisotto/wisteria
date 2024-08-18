/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AdsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { AdSchema } from '@/models/zod/ad.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:ad',
	res: AdSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	publishing: z.boolean().nullable().default(null),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.adsRepository)
		private readonly adsRepository: AdsRepository,

		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps) => {
			const query = this.queryService.makePaginationQuery(this.adsRepository.createQueryBuilder('ad'), ps.sinceId, ps.untilId);
			if (ps.publishing === true) {
				query.andWhere('ad.expiresAt > :now', { now: new Date() }).andWhere('ad.startsAt <= :now', { now: new Date() });
			} else if (ps.publishing === false) {
				query.andWhere('ad.expiresAt <= :now', { now: new Date() }).orWhere('ad.startsAt > :now', { now: new Date() });
			}
			const ads = await query.limit(ps.limit).getMany();

			return ads.map(ad => ({
				id: ad.id,
				expiresAt: ad.expiresAt.toISOString(),
				startsAt: ad.startsAt.toISOString(),
				dayOfWeek: ad.dayOfWeek,
				url: ad.url,
				imageUrl: ad.imageUrl,
				memo: ad.memo,
				place: ad.place,
				priority: ad.priority,
				ratio: ad.ratio,
			}));
		});
	}
}
