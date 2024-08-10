/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ClipsRepository } from '@/models/_.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['clips', 'account'],

	requireCredential: false,

	kind: 'read:account',

	errors: {
		noSuchClip: {
			message: 'No such clip.',
			code: 'NO_SUCH_CLIP',
			id: 'c3c5fe33-d62c-44d2-9ea5-d997703f5c20',
		},
	},

	res: ClipSchema,
} as const;

export const paramDef = z.object({
	clipId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		private readonly clipEntityService: ClipEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Fetch the clip
			const clip = await this.clipsRepository.findOneBy({
				id: ps.clipId,
			});

			if (clip == null) {
				throw new ApiError(meta.errors.noSuchClip);
			}

			if (!clip.isPublic && (me == null || (clip.userId !== me.id))) {
				throw new ApiError(meta.errors.noSuchClip);
			}

			return await this.clipEntityService.pack(clip, me);
		});
	}
}
