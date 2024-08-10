/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AdsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:ad',

	errors: {
		noSuchAd: {
			message: 'No such ad.',
			code: 'NO_SUCH_AD',
			id: 'b7aa1727-1354-47bc-a182-3a9c3973d300',
		},
	},
} as const;

export const paramDef = z.object({
	id: IdSchema,
	memo: z.string(),
	url: z.string().min(1),
	imageUrl: z.string().min(1),
	place: z.string(),
	priority: z.string(),
	ratio: z.number().int(),
	expiresAt: z.number().int(),
	startsAt: z.number().int(),
	dayOfWeek: z.number().int(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.adsRepository)
		private readonly adsRepository: AdsRepository,

		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const ad = await this.adsRepository.findOneBy({ id: ps.id });

			if (ad == null) throw new ApiError(meta.errors.noSuchAd);

			await this.adsRepository.update(ad.id, {
				url: ps.url,
				place: ps.place,
				priority: ps.priority,
				ratio: ps.ratio,
				memo: ps.memo,
				imageUrl: ps.imageUrl,
				expiresAt: new Date(ps.expiresAt),
				startsAt: new Date(ps.startsAt),
				dayOfWeek: ps.dayOfWeek,
			});

			const updatedAd = await this.adsRepository.findOneByOrFail({ id: ad.id });

			this.moderationLogService.log(me, 'updateAd', {
				adId: ad.id,
				before: ad,
				after: updatedAd,
			});
		});
	}
}
