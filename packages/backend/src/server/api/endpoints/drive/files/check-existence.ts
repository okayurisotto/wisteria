/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	description: 'Check if a given file exists.',

	res: z.boolean(),
} as const;

export const paramDef = z.object({
	md5: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const exist = await this.driveFilesRepository.exists({
				where: {
					md5: ps.md5,
					userId: me.id,
				},
			});

			return exist;
		});
	}
}
