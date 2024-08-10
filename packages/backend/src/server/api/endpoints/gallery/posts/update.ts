/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository, GalleryPostsRepository } from '@/models/_.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { GalleryPostSchema } from '@/models/zod/gallery-post.js';

export const meta = {
	tags: ['gallery'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:gallery',

	limit: {
		duration: ms('1hour'),
		max: 300,
	},

	res: GalleryPostSchema,

	errors: {

	},
} as const;

export const paramDef = z.object({
	postId: IdSchema,
	title: z.string().min(1),
	description: z.string().nullable().optional(),
	fileIds: IdSchema.array().min(1).max(32).refine(v => new Set(v).size === v.length),
	isSensitive: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly galleryPostEntityService: GalleryPostEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const files = (await Promise.all(ps.fileIds.map(fileId =>
				this.driveFilesRepository.findOneBy({
					id: fileId,
					userId: me.id,
				}),
			))).filter((file): file is MiDriveFile => file != null);

			if (files.length === 0) {
				throw new Error();
			}

			await this.galleryPostsRepository.update({
				id: ps.postId,
				userId: me.id,
			}, {
				updatedAt: new Date(),
				title: ps.title,
				description: ps.description,
				isSensitive: ps.isSensitive,
				fileIds: files.map(file => file.id),
			});

			const post = await this.galleryPostsRepository.findOneByOrFail({ id: ps.postId });

			return await this.galleryPostEntityService.pack(post, me);
		});
	}
}
