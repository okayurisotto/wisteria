/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AdsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { z } from 'zod';
import { AdSchema } from '@/models/zod/ad.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:ad',
	res: AdSchema,
} as const;

export const paramDef = z.object({
	url: z.string().min(1),
	memo: z.string(),
	place: z.string(),
	priority: z.string(),
	ratio: z.number().int(),
	expiresAt: z.number().int(),
	startsAt: z.number().int(),
	imageUrl: z.string().min(1),
	dayOfWeek: z.number().int(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.adsRepository)
		private readonly adsRepository: AdsRepository,

		private readonly idService: IdService,
		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const ad = await this.adsRepository.insert({
				id: this.idService.gen(),
				expiresAt: new Date(ps.expiresAt),
				startsAt: new Date(ps.startsAt),
				dayOfWeek: ps.dayOfWeek,
				url: ps.url,
				imageUrl: ps.imageUrl,
				priority: ps.priority,
				ratio: ps.ratio,
				place: ps.place,
				memo: ps.memo,
			}).then(r => this.adsRepository.findOneByOrFail({ id: r.identifiers[0].id }));

			this.moderationLogService.log(me, 'createAd', {
				adId: ad.id,
				ad: ad,
			});

			return {
				id: ad.id,
				expiresAt: ad.expiresAt.toISOString(),
				startsAt: ad.startsAt.toISOString(),
				dayOfWeek: ad.dayOfWeek,
				url: ad.url,
				imageUrl: ad.imageUrl,
				priority: ad.priority,
				ratio: ad.ratio,
				place: ad.place,
				memo: ad.memo,
			};
		});
	}
}
