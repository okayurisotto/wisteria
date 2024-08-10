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
			id: 'ac3ed68a-62f0-422b-a7bc-d5e09e8f6a6a',
		},
	},

	res: z.record(z.string(), z.unknown()),
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

			return item.value;
		});
	}
}
