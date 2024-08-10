/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { FlashsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { FlashSchema } from '@/models/zod/flash.js';

export const meta = {
	tags: ['flash'],

	requireCredential: false,

	res: FlashSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.flashsRepository)
		private readonly flashsRepository: FlashsRepository,

		private readonly flashEntityService: FlashEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.flashsRepository.createQueryBuilder('flash')
				.andWhere('flash.likedCount > 0')
				.orderBy('flash.likedCount', 'DESC');

			const flashs = await query.limit(10).getMany();

			return await this.flashEntityService.packMany(flashs, me);
		});
	}
}
