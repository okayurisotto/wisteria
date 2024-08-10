/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { CustomEmojiAliasService } from '@/core/CustomEmojiAliasService.js';
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
	aliases: z.string().array(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly customEmojiAliasService: CustomEmojiAliasService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.customEmojiAliasService.setAliasesBulk(ps.ids, ps.aliases);
		});
	}
}
