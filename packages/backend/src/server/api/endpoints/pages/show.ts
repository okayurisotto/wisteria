/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, PagesRepository } from '@/models/_.js';
import type { MiPage } from '@/models/Page.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { PageEntityService } from '@/core/entities/PageEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { PageSchema } from '@/models/zod/page.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['pages'],

	requireCredential: false,

	res: PageSchema,

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: '222120c0-3ead-4528-811b-b96f233388d7',
		},
	},
} as const;

export const paramDef = z.union([
	z.object({
		pageId: IdSchema,
		name: z.never().optional(),
		username: z.never().optional(),
	}),
	z.object({
		pageId: z.never().optional(),
		name: z.string(),
		username: z.string(),
	}),
]);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.pagesRepository)
		private readonly pagesRepository: PagesRepository,

		private readonly pageEntityService: PageEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let page: MiPage | null = null;

			if (ps.pageId) {
				page = await this.pagesRepository.findOneBy({ id: ps.pageId });
			} else if (ps.name && ps.username) {
				const author = await this.usersRepository.findOneBy({
					host: IsNull(),
					usernameLower: ps.username.toLowerCase(),
				});
				if (author) {
					page = await this.pagesRepository.findOneBy({
						name: ps.name,
						userId: author.id,
					});
				}
			}

			if (page == null) {
				throw new ApiError(meta.errors.noSuchPage);
			}

			return await this.pageEntityService.pack(page, me);
		});
	}
}
