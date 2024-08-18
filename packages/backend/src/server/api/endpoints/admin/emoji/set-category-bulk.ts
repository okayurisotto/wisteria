/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji',
} as const;

export const paramDef = z.object({
	ids: IdSchema.array(),
	category: z.string().nullable().describe('Use `null` to reset the category.').optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly customEmojiService: CustomEmojiService,
	) {
		super(meta, paramDef, async (ps) => {
			await this.customEmojiService.setCategoryBulk(ps.ids, ps.category ?? null);
		});
	}
}
