/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { GalleryPostsRepository } from '@/models/_.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['gallery'],

	requireCredential: false,

	res: GalleryPostSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		private readonly galleryPostEntityService: GalleryPostEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.galleryPostsRepository.createQueryBuilder('post')
				.andWhere('post.likedCount > 0')
				.orderBy('post.likedCount', 'DESC');

			const posts = await query.limit(10).getMany();

			return await this.galleryPostEntityService.packMany(posts, me);
		});
	}
}
