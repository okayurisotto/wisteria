/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { PageEntityService } from '@/core/entities/PageEntityService.js';
import type { PagesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { PageSchema } from '@/models/zod/page.js';

export const meta = {
	tags: ['users', 'pages'],

	description: 'Show all pages this user created.',

	res: PageSchema.array(),
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
		@Inject(DI.pagesRepository)
		private readonly pagesRepository: PagesRepository,

		private readonly pageEntityService: PageEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps) => {
			const query = this.queryService.makePaginationQuery(this.pagesRepository.createQueryBuilder('page'), ps.sinceId, ps.untilId)
				.andWhere('page.userId = :userId', { userId: ps.userId })
				.andWhere('page.visibility = \'public\'');

			const pages = await query
				.limit(ps.limit)
				.getMany();

			return await this.pageEntityService.packMany(pages);
		});
	}
}
