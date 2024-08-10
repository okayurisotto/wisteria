/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserListFavoritesRepository, UserListsRepository } from '@/models/_.js';
import { ApiError } from '@/server/api/error.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	requireCredential: true,
	kind: 'write:account',
	errors: {
		noSuchList: {
			message: 'No such user list.',
			code: 'NO_SUCH_USER_LIST',
			id: 'baedb33e-76b8-4b0c-86a8-9375c0a7b94b',
		},

		notFavorited: {
			message: 'You have not favorited the list.',
			code: 'ALREADY_FAVORITED',
			id: '835c4b27-463d-4cfa-969b-a9058678d465',
		},
	},
} as const;

export const paramDef = z.object({
	listId: IdSchema,
});

@Injectable() export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		@Inject(DI.userListFavoritesRepository)
		private readonly userListFavoritesRepository: UserListFavoritesRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const userListExist = await this.userListsRepository.exists({
				where: {
					id: ps.listId,
					isPublic: true,
				},
			});

			if (!userListExist) {
				throw new ApiError(meta.errors.noSuchList);
			}

			const exist = await this.userListFavoritesRepository.findOneBy({
				userListId: ps.listId,
				userId: me.id,
			});

			if (exist === null) {
				throw new ApiError(meta.errors.notFavorited);
			}

			await this.userListFavoritesRepository.delete({ id: exist.id });
		});
	}
}
