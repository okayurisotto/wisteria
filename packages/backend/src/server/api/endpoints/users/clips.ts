/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { ClipsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['users', 'clips'],

	description: 'Show all clips this user owns.',

	res: ClipSchema.array(),
} as const;

export const paramDef = z.object({
	userId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		private readonly clipEntityService: ClipEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.clipsRepository.createQueryBuilder('clip'), ps.sinceId, ps.untilId)
				.andWhere('clip.userId = :userId', { userId: ps.userId })
				.andWhere('clip.isPublic = true');

			const clips = await query
				.limit(ps.limit)
				.getMany();

			return await this.clipEntityService.packMany(clips, me);
		});
	}
}
