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

	res: z.record(z.string(), z.string()),
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
			const items = await this.registryApiService.getAllItemsOfScope(me.id, accessToken != null ? accessToken.id : (ps.domain ?? null), ps.scope);

			const res = {} as Record<string, string>;

			for (const item of items) {
				const type = typeof item.value;
				res[item.key] =
					item.value === null
						? 'null'
						: Array.isArray(item.value)
							? 'array'
							: type === 'number'
								? 'number'
								: type === 'string'
									? 'string'
									: type === 'boolean'
										? 'boolean'
										: type === 'object'
											? 'object'
											: null as never;
			}

			return res;
		});
	}
}
