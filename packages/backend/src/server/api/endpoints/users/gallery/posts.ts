/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { GalleryPostsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['users', 'gallery'],

	description: 'Show all gallery posts by the given user.',

	res: GalleryPostSchema.array(),
} as const;

export const paramDef = z.object({
	userId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		private readonly galleryPostEntityService: GalleryPostEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.galleryPostsRepository.createQueryBuilder('post'), ps.sinceId, ps.untilId)
				.andWhere('post.userId = :userId', { userId: ps.userId });

			const posts = await query
				.limit(ps.limit)
				.getMany();

			return await this.galleryPostEntityService.packMany(posts, me);
		});
	}
}
