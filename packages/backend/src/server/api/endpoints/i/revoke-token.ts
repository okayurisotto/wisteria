/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	requireCredential: true,

	secure: true,
} as const;

export const paramDef = z.union([
	z.object({
		tokenId: IdSchema,
		token: z.never().optional(),
	}),
	z.object({
		tokenId: z.never().optional(),
		token: z.string().nullable(),
	}),
]);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.tokenId) {
				const tokenExist = await this.accessTokensRepository.exists({ where: { id: ps.tokenId } });

				if (tokenExist) {
					await this.accessTokensRepository.delete({
						id: ps.tokenId,
						userId: me.id,
					});
				}
			} else if (ps.token) {
				const tokenExist = await this.accessTokensRepository.exists({ where: { token: ps.token } });

				if (tokenExist) {
					await this.accessTokensRepository.delete({
						token: ps.token,
						userId: me.id,
					});
				}
			}
		});
	}
}
