/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserListEntityService } from '@/core/entities/UserListEntityService.js';
import { ApiError } from '@/server/api/error.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserListSchema } from '@/models/zod/user-list.js';

export const meta = {
	tags: ['lists', 'account'],

	requireCredential: false,

	kind: 'read:account',

	description: 'Show all lists that the authenticated user has created.',

	res: UserListSchema.array(),
	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'a8af4a82-0980-4cc4-a6af-8b0ffd54465e',
		},
		remoteUser: {
			message: 'Not allowed to load the remote user\'s list',
			code: 'REMOTE_USER_NOT_ALLOWED',
			id: '53858f1b-3315-4a01-81b7-db9b48d4b79a',
		},
		invalidParam: {
			message: 'Invalid param.',
			code: 'INVALID_PARAM',
			id: 'ab36de0e-29e9-48cb-9732-d82f1281620d',
		},
	},
} as const;

export const paramDef = z.object({
	userId: IdSchema.optional(),
});

@Injectable() export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		private readonly userListEntityService: UserListEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (typeof ps.userId !== 'undefined') {
				const user = await this.usersRepository.findOneBy({ id: ps.userId });
				if (user === null) throw new ApiError(meta.errors.noSuchUser);
				if (user.host !== null) throw new ApiError(meta.errors.remoteUser);
			} else if (me === null) {
				throw new ApiError(meta.errors.invalidParam);
			}

			const userLists = await this.userListsRepository.findBy(typeof ps.userId === 'undefined' && me !== null
				? {
						userId: me.id,
					}
				: {
						userId: ps.userId,
						isPublic: true,
					});

			return await Promise.all(userLists.map(x => this.userListEntityService.pack(x)));
		});
	}
}
