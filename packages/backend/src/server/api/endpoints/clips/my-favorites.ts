/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ClipFavoritesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { z } from 'zod';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['account', 'clip'],

	requireCredential: true,

	kind: 'read:clip-favorite',

	res: ClipSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipFavoritesRepository)
		private readonly clipFavoritesRepository: ClipFavoritesRepository,

		private readonly clipEntityService: ClipEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.clipFavoritesRepository.createQueryBuilder('favorite')
				.andWhere('favorite.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('favorite.clip', 'clip');

			const favorites = await query
				.getMany();

			return this.clipEntityService.packMany(favorites.map(x => x.clip!), me);
		});
	}
}
