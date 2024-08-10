/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository, UserListFavoritesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserListEntityService } from '@/core/entities/UserListEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserListSchema } from '@/models/zod/user-list.js';

export const meta = {
	tags: ['lists', 'account'],

	requireCredential: false,

	kind: 'read:account',

	description: 'Show the properties of a list.',

	res: UserListSchema,

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '7bc05c21-1d7a-41ae-88f1-66820f4dc686',
		},
	},
} as const;

export const paramDef = z.object({
	listId: IdSchema,
	forPublic: z.boolean().default(false),
});

@Injectable() export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		@Inject(DI.userListFavoritesRepository)
		private readonly userListFavoritesRepository: UserListFavoritesRepository,

		private readonly userListEntityService: UserListEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const additionalProperties: Partial<{ likedCount: number; isLiked: boolean }> = {};
			// Fetch the list
			const userList = await this.userListsRepository.findOneBy(!ps.forPublic && me !== null
				? {
						id: ps.listId,
						userId: me.id,
					}
				: {
						id: ps.listId,
						isPublic: true,
					});

			if (userList == null) {
				throw new ApiError(meta.errors.noSuchList);
			}

			if (ps.forPublic && userList.isPublic) {
				additionalProperties.likedCount = await this.userListFavoritesRepository.countBy({
					userListId: ps.listId,
				});
				if (me !== null) {
					additionalProperties.isLiked = await this.userListFavoritesRepository.exists({
						where: {
							userId: me.id,
							userListId: ps.listId,
						},
					});
				} else {
					additionalProperties.isLiked = false;
				}
			}
			return {
				...await this.userListEntityService.pack(userList),
				...additionalProperties,
			};
		});
	}
}
