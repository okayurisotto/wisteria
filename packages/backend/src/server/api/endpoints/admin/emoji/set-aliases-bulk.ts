/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { CustomEmojiAliasService } from '@/core/CustomEmojiAliasService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		ids: { type: 'array', items: {
			type: 'string', format: 'misskey:id',
		} },
		aliases: { type: 'array', items: {
			type: 'string',
		} },
	},
	required: ['ids', 'aliases'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private customEmojiAliasService: CustomEmojiAliasService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.customEmojiAliasService.setAliasesBulk(ps.ids, ps.aliases);
		});
	}
}
