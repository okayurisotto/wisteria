/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { DriveFilesRepository, DriveFoldersRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiDriveFolder } from '@/models/DriveFolder.js';
import { IdService } from '@/core/IdService.js';
import type { z } from 'zod';
import type { DriveFolderSchema } from '@/models/zod/drive-folder';

@Injectable()
export class DriveFolderEntityService {
	constructor(
		@Inject(DI.driveFoldersRepository)
		private readonly driveFoldersRepository: DriveFoldersRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly idService: IdService,
	) {}

	public async pack(
		src: MiDriveFolder['id'] | MiDriveFolder,
		options?: {
			detail: boolean;
		},
	): Promise<z.infer<typeof DriveFolderSchema>> {
		const opts = Object.assign({
			detail: false,
		}, options);

		const folder = typeof src === 'object' ? src : await this.driveFoldersRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: folder.id,
			createdAt: this.idService.parse(folder.id).date.toISOString(),
			name: folder.name,
			parentId: folder.parentId,

			...(opts.detail
				? {
						foldersCount: this.driveFoldersRepository.countBy({
							parentId: folder.id,
						}),
						filesCount: this.driveFilesRepository.countBy({
							folderId: folder.id,
						}),

						...(folder.parentId
							? {
									parent: this.pack(folder.parentId, {
										detail: true,
									}),
								}
							: {}),
					}
				: {}),
		});
	}
}
