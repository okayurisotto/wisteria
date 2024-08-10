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
	kind: 'read:account',

	res: z.string().array(),
} as const;

export const paramDef = z.object({
	scope: z.string().regex(/^[a-zA-Z0-9_]+$/).array().default([]),
	domain: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly registryApiService: RegistryApiService,
	) {
		super(meta, paramDef, async (ps, me, accessToken) => {
			return await this.registryApiService.getAllKeysOfScope(me.id, accessToken != null ? accessToken.id : (ps.domain ?? null), ps.scope);
		});
	}
}
