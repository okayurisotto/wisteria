/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageAvatarDecorations',
	kind: 'write:admin:avatar-decorations',
	errors: {
	},
} as const;

export const paramDef = z.object({
	id: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly avatarDecorationService: AvatarDecorationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.avatarDecorationService.delete(ps.id, me);
		});
	}
}
