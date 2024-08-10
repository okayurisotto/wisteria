/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFoldersRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DriveFolderEntityService } from '@/core/entities/DriveFolderEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { DriveFolderSchema } from '@/models/zod/drive-folder.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	res: DriveFolderSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	folderId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFoldersRepository)
		private readonly driveFoldersRepository: DriveFoldersRepository,

		private readonly driveFolderEntityService: DriveFolderEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.driveFoldersRepository.createQueryBuilder('folder'), ps.sinceId, ps.untilId)
				.andWhere('folder.userId = :userId', { userId: me.id });

			if (ps.folderId) {
				query.andWhere('folder.parentId = :parentId', { parentId: ps.folderId });
			} else {
				query.andWhere('folder.parentId IS NULL');
			}

			const folders = await query.limit(ps.limit).getMany();

			return await Promise.all(folders.map(folder => this.driveFolderEntityService.pack(folder)));
		});
	}
}
