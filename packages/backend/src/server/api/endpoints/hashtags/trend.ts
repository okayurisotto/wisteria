/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { FeaturedService } from '@/core/FeaturedService.js';
import { HashtagService } from '@/core/HashtagService.js';
import { z } from 'zod';

export const meta = {
	tags: ['hashtags'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 1,

	res: z.object({
		tag: z.string().optional(),
		chart: z.number().array().optional(),
		usersCount: z.number().optional(),
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly featuredService: FeaturedService,
		private readonly hashtagService: HashtagService,
	) {
		super(meta, paramDef, async () => {
			const ranking = await this.featuredService.getHashtagsRanking(10);

			const charts = ranking.length === 0 ? {} : await this.hashtagService.getCharts(ranking, 20);

			const stats = ranking.map((tag) => ({
				tag,
				chart: charts[tag],
				usersCount: Math.max(...charts[tag]),
			}));

			return stats;
		});
	}
}
