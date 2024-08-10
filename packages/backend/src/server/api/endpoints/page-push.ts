/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { PagesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	requireCredential: true,
	secure: true,

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: '4a13ad31-6729-46b4-b9af-e86b265c2e74',
		},
	},
} as const;

export const paramDef = z.object({
	pageId: IdSchema,
	event: z.string(),
	var: z.unknown().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.pagesRepository)
		private readonly pagesRepository: PagesRepository,

		private readonly userEntityService: UserEntityService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const page = await this.pagesRepository.findOneBy({ id: ps.pageId });
			if (page == null) {
				throw new ApiError(meta.errors.noSuchPage);
			}

			this.globalEventService.publishMainStream(page.userId, 'pageEvent', {
				pageId: ps.pageId,
				event: ps.event,
				var: ps.var,
				userId: me.id,
				user: await this.userEntityService.pack(me.id, { id: page.userId }, {
					schema: 'UserDetailed',
				}),
			});
		});
	}
}
