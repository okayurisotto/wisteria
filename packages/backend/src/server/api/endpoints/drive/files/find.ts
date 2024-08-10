/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { DriveFileSchema } from '@/models/zod/drive-file.js';

export const meta = {
	requireCredential: true,

	tags: ['drive'],

	kind: 'read:drive',

	description: 'Search for a drive file by the given parameters.',

	res: DriveFileSchema.array(),
} as const;

export const paramDef = z.object({
	name: z.string(),
	folderId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly driveFileEntityService: DriveFileEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const files = await this.driveFilesRepository.findBy({
				name: ps.name,
				userId: me.id,
				folderId: ps.folderId ?? IsNull(),
			});

			return await Promise.all(files.map(file => this.driveFileEntityService.pack(file, { self: true })));
		});
	}
}
