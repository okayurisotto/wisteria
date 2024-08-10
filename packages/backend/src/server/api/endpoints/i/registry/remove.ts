/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RegistryApiService } from '@/core/RegistryApiService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	kind: 'write:account',

	errors: {
		noSuchKey: {
			message: 'No such key.',
			code: 'NO_SUCH_KEY',
			id: '1fac4e8a-a6cd-4e39-a4a5-3a7e11f1b019',
		},
	},
} as const;

export const paramDef = z.object({
	key: z.string(),
	scope: z.string().regex(/^[a-zA-Z0-9_]+$/).array().default([]),
	domain: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly registryApiService: RegistryApiService,
	) {
		super(meta, paramDef, async (ps, me, accessToken) => {
			await this.registryApiService.remove(me.id, accessToken != null ? accessToken.id : (ps.domain ?? null), ps.scope, ps.key);
		});
	}
}
