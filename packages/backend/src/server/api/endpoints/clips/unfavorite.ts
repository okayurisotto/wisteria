/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { ClipsRepository, ClipFavoritesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['clip'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:clip-favorite',

	errors: {
		noSuchClip: {
			message: 'No such clip.',
			code: 'NO_SUCH_CLIP',
			id: '2603966e-b865-426c-94a7-af4a01241dc1',
		},

		notFavorited: {
			message: 'You have not favorited the clip.',
			code: 'NOT_FAVORITED',
			id: '90c3a9e8-b321-4dae-bf57-2bf79bbcc187',
		},
	},
} as const;

export const paramDef = z.object({
	clipId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		@Inject(DI.clipFavoritesRepository)
		private readonly clipFavoritesRepository: ClipFavoritesRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const clip = await this.clipsRepository.findOneBy({ id: ps.clipId });
			if (clip == null) {
				throw new ApiError(meta.errors.noSuchClip);
			}

			const exist = await this.clipFavoritesRepository.findOneBy({
				clipId: clip.id,
				userId: me.id,
			});

			if (exist == null) {
				throw new ApiError(meta.errors.notFavorited);
			}

			await this.clipFavoritesRepository.delete(exist.id);
		});
	}
}
