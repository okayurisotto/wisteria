/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageAvatarDecorations',
	kind: 'write:admin:avatar-decorations',
} as const;

export const paramDef = z.object({
	name: z.string().min(1),
	description: z.string(),
	url: z.string().min(1),
	roleIdsThatCanBeUsedThisDecoration: z.string().array().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly avatarDecorationService: AvatarDecorationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.avatarDecorationService.create({
				name: ps.name,
				description: ps.description,
				url: ps.url,
				roleIdsThatCanBeUsedThisDecoration: ps.roleIdsThatCanBeUsedThisDecoration,
			}, me);
		});
	}
}
