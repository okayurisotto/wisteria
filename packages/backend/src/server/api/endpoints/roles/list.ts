/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RolesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { RoleEntityService } from '@/core/entities/RoleEntityService.js';
import { z } from 'zod';
import { RoleSchema } from '@/models/zod/role.js';

export const meta = {
	tags: ['role'],

	requireCredential: true,
	kind: 'read:account',

	res: RoleSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.rolesRepository)
		private readonly rolesRepository: RolesRepository,

		private readonly roleEntityService: RoleEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const roles = await this.rolesRepository.findBy({
				isPublic: true,
				isExplorable: true,
			});
			return await this.roleEntityService.packMany(roles, me);
		});
	}
}
