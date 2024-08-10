/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFoldersRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { DriveFolderEntityService } from '@/core/entities/DriveFolderEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { DriveFolderSchema } from '@/models/zod/drive-folder.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'write:drive',

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	errors: {
		noSuchFolder: {
			message: 'No such folder.',
			code: 'NO_SUCH_FOLDER',
			id: '53326628-a00d-40a6-a3cd-8975105c0f95',
		},
	},

	res: DriveFolderSchema,
} as const;

export const paramDef = z.object({
	name: z.string().max(200).default('Untitled'),
	parentId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFoldersRepository)
		private readonly driveFoldersRepository: DriveFoldersRepository,

		private readonly driveFolderEntityService: DriveFolderEntityService,
		private readonly idService: IdService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// If the parent folder is specified
			let parent = null;
			if (ps.parentId) {
				// Fetch parent folder
				parent = await this.driveFoldersRepository.findOneBy({
					id: ps.parentId,
					userId: me.id,
				});

				if (parent == null) {
					throw new ApiError(meta.errors.noSuchFolder);
				}
			}

			// Create folder
			const folder = await this.driveFoldersRepository.insert({
				id: this.idService.gen(),
				name: ps.name,
				parentId: parent !== null ? parent.id : null,
				userId: me.id,
			}).then(x => this.driveFoldersRepository.findOneByOrFail(x.identifiers[0]));

			const folderObj = await this.driveFolderEntityService.pack(folder);

			// Publish folderCreated event
			this.globalEventService.publishDriveStream(me.id, 'folderCreated', folderObj);

			return folderObj;
		});
	}
}
