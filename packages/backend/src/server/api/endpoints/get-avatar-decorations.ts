/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { RoleService } from '@/core/RoleService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: z.object({
		id: IdSchema.optional(),
		name: z.string().optional(),
		description: z.string().optional(),
		url: z.string().optional(),
		roleIdsThatCanBeUsedThisDecoration: IdSchema.array().optional(),
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly avatarDecorationService: AvatarDecorationService,
		private readonly roleService: RoleService,
	) {
		super(meta, paramDef, async () => {
			const decorations = await this.avatarDecorationService.getAll();
			const allRoles = await this.roleService.getRoles();

			return decorations.map(decoration => ({
				id: decoration.id,
				name: decoration.name,
				description: decoration.description,
				url: decoration.url,
				roleIdsThatCanBeUsedThisDecoration: decoration.roleIdsThatCanBeUsedThisDecoration.filter(roleId => allRoles.some(role => role.id === roleId)),
			}));
		});
	}
}
