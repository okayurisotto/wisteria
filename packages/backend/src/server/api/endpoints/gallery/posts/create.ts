/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository, GalleryPostsRepository } from '@/models/_.js';
import { MiGalleryPost } from '@/models/GalleryPost.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { IdService } from '@/core/IdService.js';
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
		max: 20,
	},

	res: GalleryPostSchema,

	errors: {

	},
} as const;

export const paramDef = z.object({
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
		private readonly idService: IdService,
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

			const post = await this.galleryPostsRepository.insert(new MiGalleryPost({
				id: this.idService.gen(),
				updatedAt: new Date(),
				title: ps.title,
				description: ps.description,
				userId: me.id,
				isSensitive: ps.isSensitive,
				fileIds: files.map(file => file.id),
			})).then(x => this.galleryPostsRepository.findOneByOrFail(x.identifiers[0]));

			return await this.galleryPostEntityService.pack(post, me);
		});
	}
}
