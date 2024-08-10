/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { DriveFilesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { DriveFileSchema } from '@/models/zod/drive-file.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	description: 'Search for a drive file by a hash of the contents.',

	res: DriveFileSchema.array(),
} as const;

export const paramDef = z.object({
	md5: z.string(),
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
				md5: ps.md5,
				userId: me.id,
			});

			return await this.driveFileEntityService.packMany(files, { self: true });
		});
	}
}
