/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';

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
		license: {
			type: 'string',
			nullable: true,
			description: 'Use `null` to reset the license.',
		},
	},
	required: ['ids'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private customEmojiService: CustomEmojiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.customEmojiService.setLicenseBulk(ps.ids, ps.license ?? null);
		});
	}
}
