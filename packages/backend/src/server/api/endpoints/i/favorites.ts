/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { NoteFavoritesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteFavoriteEntityService } from '@/core/entities/NoteFavoriteEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteFavoriteSchema } from '@/models/zod/note-favorite.js';

export const meta = {
	tags: ['account', 'notes', 'favorites'],

	requireCredential: true,

	kind: 'read:favorites',

	res: NoteFavoriteSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.noteFavoritesRepository)
		private readonly noteFavoritesRepository: NoteFavoritesRepository,

		private readonly noteFavoriteEntityService: NoteFavoriteEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.noteFavoritesRepository.createQueryBuilder('favorite'), ps.sinceId, ps.untilId)
				.andWhere('favorite.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('favorite.note', 'note');

			const favorites = await query
				.limit(ps.limit)
				.getMany();

			return await this.noteFavoriteEntityService.packMany(favorites, me);
		});
	}
}
