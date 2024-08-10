/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MiDriveFile } from '@/models/DriveFile.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { DriveFileSchema } from '@/models/zod/drive-file.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	description: 'Show the properties of a drive file.',

	res: DriveFileSchema,

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '067bc436-2718-4795-b0fb-ecbe43949e31',
		},

		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '25b73c73-68b1-41d0-bad1-381cfdf6579f',
		},
	},
} as const;

export const paramDef = z.union([
	z.object({
		fileId: IdSchema,
		url: z.never().optional(),
	}),
	z.object({
		fileId: z.never().optional(),
		url: z.string(),
	}),
]);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let file: MiDriveFile | null = null;

			if (ps.fileId) {
				file = await this.driveFilesRepository.findOneBy({ id: ps.fileId });
			} else if (ps.url) {
				file = await this.driveFilesRepository.findOne({
					where: [{
						url: ps.url,
					}, {
						webpublicUrl: ps.url,
					}, {
						thumbnailUrl: ps.url,
					}],
				});
			}

			if (file == null) {
				throw new ApiError(meta.errors.noSuchFile);
			}

			if (!await this.roleUserService.isModerator(me) && (file.userId !== me.id)) {
				throw new ApiError(meta.errors.accessDenied);
			}

			return await this.driveFileEntityService.pack(file, {
				detail: true,
				withUser: true,
				self: true,
			});
		});
	}
}
