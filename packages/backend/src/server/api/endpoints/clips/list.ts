/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ClipsRepository } from '@/models/_.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['clips', 'account'],

	requireCredential: true,

	kind: 'read:account',

	res: ClipSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		private readonly clipEntityService: ClipEntityService,
	) {
		super(meta, paramDef, async (_ps, me) => {
			const clips = await this.clipsRepository.findBy({
				userId: me.id,
			});

			return await this.clipEntityService.packMany(clips, me);
		});
	}
}
