/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFoldersRepository } from '@/models/_.js';
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
	name: z.string(),
	parentId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFoldersRepository)
		private readonly driveFoldersRepository: DriveFoldersRepository,

		private readonly driveFolderEntityService: DriveFolderEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const folders = await this.driveFoldersRepository.findBy({
				name: ps.name,
				userId: me.id,
				parentId: ps.parentId ?? IsNull(),
			});

			return await Promise.all(folders.map(folder => this.driveFolderEntityService.pack(folder)));
		});
	}
}
