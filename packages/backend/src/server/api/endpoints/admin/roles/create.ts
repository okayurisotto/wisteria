/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RoleEntityService } from '@/core/entities/RoleEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { z } from 'zod';
import { RoleSchema } from '@/models/zod/role.js';

export const meta = {
	tags: ['admin', 'role'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',

	res: RoleSchema,
} as const;

export const paramDef = z.object({
	name: z.string(),
	description: z.string(),
	color: z.string().nullable(),
	iconUrl: z.string().nullable(),
	target: z.enum(['manual', 'conditional']),
	condFormula: z.record(z.string(), z.unknown()),
	isPublic: z.boolean(),
	isModerator: z.boolean(),
	isAdministrator: z.boolean(),
	isExplorable: z.boolean().default(false),
	asBadge: z.boolean(),
	canEditMembersByModerator: z.boolean(),
	displayOrder: z.number(),
	policies: z.record(z.string(), z.unknown()),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly roleEntityService: RoleEntityService,
		private readonly roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const created = await this.roleService.create(ps, me);

			return await this.roleEntityService.pack(created, me);
		});
	}
}
