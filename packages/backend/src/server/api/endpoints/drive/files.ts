/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { DriveFileSchema } from '@/models/zod/drive-file.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	res: DriveFileSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	folderId: IdSchema.nullable().optional(),
	type: z.string().regex(/^[a-zA-Z/\-*]+$/).nullable().optional(),
	sort: z.enum(['+createdAt', '-createdAt', '+name', '-name', '+size', '-size']).nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.driveFilesRepository.createQueryBuilder('file'), ps.sinceId, ps.untilId)
				.andWhere('file.userId = :userId', { userId: me.id });

			if (ps.folderId) {
				query.andWhere('file.folderId = :folderId', { folderId: ps.folderId });
			} else {
				query.andWhere('file.folderId IS NULL');
			}

			if (ps.type) {
				if (ps.type.endsWith('/*')) {
					query.andWhere('file.type like :type', { type: ps.type.replace('/*', '/') + '%' });
				} else {
					query.andWhere('file.type = :type', { type: ps.type });
				}
			}

			switch (ps.sort) {
				case '+createdAt': query.orderBy('file.id', 'DESC'); break;
				case '-createdAt': query.orderBy('file.id', 'ASC'); break;
				case '+name': query.orderBy('file.name', 'DESC'); break;
				case '-name': query.orderBy('file.name', 'ASC'); break;
				case '+size': query.orderBy('file.size', 'DESC'); break;
				case '-size': query.orderBy('file.size', 'ASC'); break;
			}

			const files = await query.limit(ps.limit).getMany();

			return await this.driveFileEntityService.packMany(files, { detail: false, self: true });
		});
	}
}
