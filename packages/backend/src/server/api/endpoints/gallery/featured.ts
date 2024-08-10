/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { GalleryPostsRepository } from '@/models/_.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { DI } from '@/di-symbols.js';
import { FeaturedService } from '@/core/FeaturedService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['gallery'],

	requireCredential: false,

	res: GalleryPostSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	private galleryPostsRankingCache: string[] = [];
	private galleryPostsRankingCacheLastFetchedAt = 0;

	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		private readonly galleryPostEntityService: GalleryPostEntityService,
		private readonly featuredService: FeaturedService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let postIds: string[];
			if (this.galleryPostsRankingCacheLastFetchedAt !== 0 && (Date.now() - this.galleryPostsRankingCacheLastFetchedAt < 1000 * 60 * 30)) {
				postIds = this.galleryPostsRankingCache;
			} else {
				postIds = await this.featuredService.getGalleryPostsRanking(100);
				this.galleryPostsRankingCache = postIds;
				this.galleryPostsRankingCacheLastFetchedAt = Date.now();
			}

			postIds.sort((a, b) => a > b ? -1 : 1);
			if (ps.untilId) {
				postIds = postIds.filter(id => id < ps.untilId!);
			}
			postIds = postIds.slice(0, ps.limit);

			if (postIds.length === 0) {
				return [];
			}

			const query = this.galleryPostsRepository.createQueryBuilder('post')
				.where('post.id IN (:...postIds)', { postIds: postIds });

			const posts = await query.getMany();

			return await this.galleryPostEntityService.packMany(posts, me);
		});
	}
}
