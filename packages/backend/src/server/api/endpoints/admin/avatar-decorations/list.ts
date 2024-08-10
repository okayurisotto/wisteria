/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { IdService } from '@/core/IdService.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageAvatarDecorations',
	kind: 'read:admin:avatar-decorations',

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		updatedAt: z.string().nullable()/* format: date-time */.optional(),
		name: z.string().optional(),
		description: z.string().optional(),
		url: z.string().optional(),
		roleIdsThatCanBeUsedThisDecoration: IdSchema.array().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	userId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly avatarDecorationService: AvatarDecorationService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const avatarDecorations = await this.avatarDecorationService.getAll();

			return avatarDecorations.map(avatarDecoration => ({
				id: avatarDecoration.id,
				createdAt: this.idService.parse(avatarDecoration.id).date.toISOString(),
				updatedAt: avatarDecoration.updatedAt?.toISOString() ?? null,
				name: avatarDecoration.name,
				description: avatarDecoration.description,
				url: avatarDecoration.url,
				roleIdsThatCanBeUsedThisDecoration: avatarDecoration.roleIdsThatCanBeUsedThisDecoration,
			}));
		});
	}
}
