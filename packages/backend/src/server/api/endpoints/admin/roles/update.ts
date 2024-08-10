/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RolesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { RoleService } from '@/core/RoleService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin', 'role'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',

	errors: {
		noSuchRole: {
			message: 'No such role.',
			code: 'NO_SUCH_ROLE',
			id: 'cd23ef55-09ad-428a-ac61-95a45e124b32',
		},
	},
} as const;

export const paramDef = z.object({
	roleId: IdSchema,
	name: z.string(),
	description: z.string(),
	color: z.string().nullable(),
	iconUrl: z.string().nullable(),
	target: z.enum(['manual', 'conditional']),
	condFormula: z.record(z.string(), z.unknown()),
	isPublic: z.boolean(),
	isModerator: z.boolean(),
	isAdministrator: z.boolean(),
	isExplorable: z.boolean().optional(),
	asBadge: z.boolean(),
	canEditMembersByModerator: z.boolean(),
	displayOrder: z.number(),
	policies: z.record(z.string(), z.unknown()),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.rolesRepository)
		private readonly rolesRepository: RolesRepository,

		private readonly roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const role = await this.rolesRepository.findOneBy({ id: ps.roleId });
			if (role == null) {
				throw new ApiError(meta.errors.noSuchRole);
			}

			await this.roleService.update(role, {
				name: ps.name,
				description: ps.description,
				color: ps.color,
				iconUrl: ps.iconUrl,
				target: ps.target,
				condFormula: ps.condFormula,
				isPublic: ps.isPublic,
				isModerator: ps.isModerator,
				isAdministrator: ps.isAdministrator,
				isExplorable: ps.isExplorable,
				asBadge: ps.asBadge,
				canEditMembersByModerator: ps.canEditMembersByModerator,
				displayOrder: ps.displayOrder,
				policies: ps.policies,
			}, me);
		});
	}
}
