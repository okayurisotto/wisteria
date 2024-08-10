/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { PagesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { PageEntityService } from '@/core/entities/PageEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { PageSchema } from '@/models/zod/page.js';

export const meta = {
	tags: ['pages'],

	requireCredential: false,

	res: PageSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.pagesRepository)
		private readonly pagesRepository: PagesRepository,

		private readonly pageEntityService: PageEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.pagesRepository.createQueryBuilder('page')
				.where('page.visibility = \'public\'')
				.andWhere('page.likedCount > 0')
				.orderBy('page.likedCount', 'DESC');

			const pages = await query.limit(10).getMany();

			return await this.pageEntityService.packMany(pages, me);
		});
	}
}
