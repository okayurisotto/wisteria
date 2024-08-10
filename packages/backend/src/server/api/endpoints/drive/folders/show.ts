/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFoldersRepository } from '@/models/_.js';
import { DriveFolderEntityService } from '@/core/entities/DriveFolderEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { DriveFolderSchema } from '@/models/zod/drive-folder.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	res: DriveFolderSchema,

	errors: {
		noSuchFolder: {
			message: 'No such folder.',
			code: 'NO_SUCH_FOLDER',
			id: 'd74ab9eb-bb09-4bba-bf24-fb58f761e1e9',
		},
	},
} as const;

export const paramDef = z.object({
	folderId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFoldersRepository)
		private readonly driveFoldersRepository: DriveFoldersRepository,

		private readonly driveFolderEntityService: DriveFolderEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Get folder
			const folder = await this.driveFoldersRepository.findOneBy({
				id: ps.folderId,
				userId: me.id,
			});

			if (folder == null) {
				throw new ApiError(meta.errors.noSuchFolder);
			}

			return await this.driveFolderEntityService.pack(folder, {
				detail: true,
			});
		});
	}
}
