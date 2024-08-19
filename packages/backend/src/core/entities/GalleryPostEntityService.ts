/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { GalleryLikesRepository, GalleryPostsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { MiGalleryPost } from '@/models/GalleryPost.js';
import { IdService } from '@/core/IdService.js';
import { DriveFileEntityService } from './DriveFileEntityService.js';
import type { z } from 'zod';
import type { GalleryPostSchema } from '@/models/zod/gallery-post.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class GalleryPostEntityService {
	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		@Inject(DI.galleryLikesRepository)
		private readonly galleryLikesRepository: GalleryLikesRepository,

		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiGalleryPost['id'] | MiGalleryPost,
		me?: { id: MiUser['id'] } | null | undefined,
	): Promise<z.infer<typeof GalleryPostSchema>> {
		const meId = me ? me.id : null;
		const post = typeof src === 'object' ? src : await this.galleryPostsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: post.id,
			createdAt: this.idService.parse(post.id).date.toISOString(),
			updatedAt: post.updatedAt.toISOString(),
			userId: post.userId,
			user: this.userLiteEntityService.packLite(post.user ?? post.userId),
			title: post.title,
			description: post.description,
			fileIds: post.fileIds,
			// TODO: packMany causes N+1 queries
			files: this.driveFileEntityService.packManyByIds(post.fileIds),
			tags: post.tags.length > 0 ? post.tags : undefined,
			isSensitive: post.isSensitive,
			likedCount: post.likedCount,
			isLiked: meId ? await this.galleryLikesRepository.exists({ where: { postId: post.id, userId: meId } }) : undefined,
		});
	}

	public packMany(
		posts: MiGalleryPost[],
		me?: { id: MiUser['id'] } | null | undefined,
	) {
		return Promise.all(posts.map(x => this.pack(x, me)));
	}
}
