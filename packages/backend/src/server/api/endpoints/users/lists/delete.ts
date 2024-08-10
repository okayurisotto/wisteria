/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['lists'],

	requireCredential: true,

	kind: 'write:account',

	description: 'Delete an existing list of users.',

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '78436795-db79-42f5-b1e2-55ea2cf19166',
		},
	},
} as const;

export const paramDef = z.object({
	listId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const userList = await this.userListsRepository.findOneBy({
				id: ps.listId,
				userId: me.id,
			});

			if (userList == null) {
				throw new ApiError(meta.errors.noSuchList);
			}

			await this.userListsRepository.delete(userList.id);
		});
	}
}
