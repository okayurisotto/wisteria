/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserListEntityService } from '@/core/entities/UserListEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserListSchema } from '@/models/zod/user-list.js';

export const meta = {
	tags: ['lists'],

	requireCredential: true,

	kind: 'write:account',

	description: 'Update the properties of a list.',

	res: UserListSchema,

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '796666fe-3dff-4d39-becb-8a5932c1d5b7',
		},
	},
} as const;

export const paramDef = z.object({
	listId: IdSchema,
	name: z.string().min(1).max(100).optional(),
	isPublic: z.boolean().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		private readonly userListEntityService: UserListEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const userList = await this.userListsRepository.findOneBy({
				id: ps.listId,
				userId: me.id,
			});

			if (userList == null) {
				throw new ApiError(meta.errors.noSuchList);
			}

			await this.userListsRepository.update(userList.id, {
				name: ps.name,
				isPublic: ps.isPublic,
			});

			return await this.userListEntityService.pack(userList.id);
		});
	}
}
