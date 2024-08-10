/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserListsRepository, UserListMembershipsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserListEntityService } from '@/core/entities/UserListEntityService.js';
import { DI } from '@/di-symbols.js';
import { QueryService } from '@/core/QueryService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserLiteSchema } from '@/models/zod/user-lite.js';

export const meta = {
	tags: ['lists', 'account'],

	requireCredential: false,

	kind: 'read:account',

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '7bc05c21-1d7a-41ae-88f1-66820f4dc686',
		},
	},

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		userId: IdSchema.optional(),
		user: UserLiteSchema.optional(),
		withReplies: z.boolean().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	listId: IdSchema,
	forPublic: z.boolean().default(false),
	limit: z.number().int().min(1).max(100).default(30),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable() export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		@Inject(DI.userListMembershipsRepository)
		private readonly userListMembershipsRepository: UserListMembershipsRepository,

		private readonly userListEntityService: UserListEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
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

			const query = this.queryService.makePaginationQuery(this.userListMembershipsRepository.createQueryBuilder('membership'), ps.sinceId, ps.untilId)
				.andWhere('membership.userListId = :userListId', { userListId: userList.id })
				.innerJoinAndSelect('membership.user', 'user');

			const memberships = await query
				.limit(ps.limit)
				.getMany();

			return this.userListEntityService.packMembershipsMany(memberships);
		});
	}
}
