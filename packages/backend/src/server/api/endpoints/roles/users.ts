/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import type { RoleAssignmentsRepository, RolesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserDetailedSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['role', 'users'],

	requireCredential: false,

	errors: {
		noSuchRole: {
			message: 'No such role.',
			code: 'NO_SUCH_ROLE',
			id: '30aaaee3-4792-48dc-ab0d-cf501a575ac5',
		},
	},

	res: z.object({
		id: IdSchema,
		user: UserDetailedSchema,
	}).array(),
} as const;

export const paramDef = z.object({
	roleId: IdSchema,
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(10),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.rolesRepository)
		private readonly rolesRepository: RolesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private readonly roleAssignmentsRepository: RoleAssignmentsRepository,

		private readonly queryService: QueryService,
		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const role = await this.rolesRepository.findOneBy({
				id: ps.roleId,
				isPublic: true,
				isExplorable: true,
			});

			if (role == null) {
				throw new ApiError(meta.errors.noSuchRole);
			}

			const query = this.queryService.makePaginationQuery(this.roleAssignmentsRepository.createQueryBuilder('assign'), ps.sinceId, ps.untilId)
				.andWhere('assign.roleId = :roleId', { roleId: role.id })
				.andWhere(new Brackets((qb) => {
					qb
						.where('assign.expiresAt IS NULL')
						.orWhere('assign.expiresAt > :now', { now: new Date() });
				}))
				.innerJoinAndSelect('assign.user', 'user');

			const assigns = await query
				.limit(ps.limit)
				.getMany();

			return await Promise.all(assigns.map(async assign => ({
				id: assign.id,
				user: await this.userEntityService.pack(assign.user!, me, { schema: 'UserDetailed' }),
			})));
		});
	}
}
