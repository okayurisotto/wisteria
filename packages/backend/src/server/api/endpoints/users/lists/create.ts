/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import type { MiUserList } from '@/models/UserList.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserListEntityService } from '@/core/entities/UserListEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { z } from 'zod';
import { UserListSchema } from '@/models/zod/user-list.js';

export const meta = {
	tags: ['lists'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:account',

	description: 'Create a new list of users.',

	res: UserListSchema,

	errors: {
		tooManyUserLists: {
			message: 'You cannot create user list any more.',
			code: 'TOO_MANY_USERLISTS',
			id: '0cf21a28-7715-4f39-a20d-777bfdb8d138',
		},
	},
} as const;

export const paramDef = z.object({
	name: z.string().min(1).max(100),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		private readonly userListEntityService: UserListEntityService,
		private readonly idService: IdService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const currentCount = await this.userListsRepository.countBy({
				userId: me.id,
			});
			if (currentCount > (await this.roleUserService.getUserPolicies(me.id)).userListLimit) {
				throw new ApiError(meta.errors.tooManyUserLists);
			}

			const userList = await this.userListsRepository.insert({
				id: this.idService.gen(),
				userId: me.id,
				name: ps.name,
			} as MiUserList).then(x => this.userListsRepository.findOneByOrFail(x.identifiers[0]));

			return await this.userListEntityService.pack(userList);
		});
	}
}
