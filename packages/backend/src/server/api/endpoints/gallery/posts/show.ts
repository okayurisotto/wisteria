/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { GalleryPostsRepository } from '@/models/_.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['gallery'],

	requireCredential: false,

	errors: {
		noSuchPost: {
			message: 'No such post.',
			code: 'NO_SUCH_POST',
			id: '1137bf14-c5b0-4604-85bb-5b5371b1cd45',
		},
	},

	res: GalleryPostSchema,
} as const;

export const paramDef = z.object({
	postId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		private readonly galleryPostEntityService: GalleryPostEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const post = await this.galleryPostsRepository.findOneBy({
				id: ps.postId,
			});

			if (post == null) {
				throw new ApiError(meta.errors.noSuchPost);
			}

			return await this.galleryPostEntityService.pack(post, me);
		});
	}
}
