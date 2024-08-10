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
} as const;

export const paramDef = z.object({
	key: z.string().min(1),
	value: z.unknown(),
	scope: z.string().regex(/^[a-zA-Z0-9_]+$/).array().default([]),
	domain: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly registryApiService: RegistryApiService,
	) {
		super(meta, paramDef, async (ps, me, accessToken) => {
			await this.registryApiService.set(me.id, accessToken ? accessToken.id : (ps.domain ?? null), ps.scope, ps.key, ps.value);
		});
	}
}
