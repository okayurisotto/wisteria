/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RegistryApiService } from '@/core/RegistryApiService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	kind: 'read:account',

	errors: {
		noSuchKey: {
			message: 'No such key.',
			code: 'NO_SUCH_KEY',
			id: '97a1e8e7-c0f7-47d2-957a-92e61256e01a',
		},
	},

	res: z.object({
		updatedAt: z.string(),
		value: z.string(),
	}),
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
			const item = await this.registryApiService.getItem(me.id, accessToken != null ? accessToken.id : (ps.domain ?? null), ps.scope, ps.key);

			if (item == null) {
				throw new ApiError(meta.errors.noSuchKey);
			}

			return {
				updatedAt: item.updatedAt.toISOString(),
				value: item.value,
			};
		});
	}
}
