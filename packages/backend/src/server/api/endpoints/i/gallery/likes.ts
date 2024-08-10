/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { GalleryLikesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { GalleryLikeEntityService } from '@/core/entities/GalleryLikeEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['account', 'gallery'],

	requireCredential: true,

	kind: 'read:gallery-likes',

	res: z.object({
		id: IdSchema.optional(),
		post: GalleryPostSchema.optional(),
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
		@Inject(DI.galleryLikesRepository)
		private readonly galleryLikesRepository: GalleryLikesRepository,

		private readonly galleryLikeEntityService: GalleryLikeEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.galleryLikesRepository.createQueryBuilder('like'), ps.sinceId, ps.untilId)
				.andWhere('like.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('like.post', 'post');

			const likes = await query
				.limit(ps.limit)
				.getMany();

			return await this.galleryLikeEntityService.packMany(likes, me);
		});
	}
}
