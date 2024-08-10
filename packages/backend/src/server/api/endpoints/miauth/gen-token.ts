/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['auth'],

	requireCredential: true,

	secure: true,

	res: z.object({
		token: z.string().optional(),
	}),
} as const;

export const paramDef = z.object({
	session: z.string().nullable(),
	name: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	iconUrl: z.string().nullable().optional(),
	permission: z.string().array().refine(v => new Set(v).size === v.length),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Generate access token
			const accessToken = secureRndstr(32);

			const now = new Date();

			// Insert access token doc
			await this.accessTokensRepository.insert({
				id: this.idService.gen(now.getTime()),
				lastUsedAt: now,
				session: ps.session,
				userId: me.id,
				token: accessToken,
				hash: accessToken,
				name: ps.name,
				description: ps.description,
				iconUrl: ps.iconUrl,
				permission: ps.permission,
			});

			return {
				token: accessToken,
			};
		});
	}
}
