/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	requireCredential: true,

	secure: true,

	res: z.object({
		id: IdSchema.optional(),
		name: z.string().optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		lastUsedAt: z.string()/* format: date-time */.optional(),
		permission: z.string().array().refine(v => new Set(v).size === v.length).optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	sort: z.enum(['+createdAt', '-createdAt', '+lastUsedAt', '-lastUsedAt']).optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.accessTokensRepository.createQueryBuilder('token')
				.where('token.userId = :userId', { userId: me.id })
				.leftJoinAndSelect('token.app', 'app');

			switch (ps.sort) {
				case '+createdAt': query.orderBy('token.id', 'DESC'); break;
				case '-createdAt': query.orderBy('token.id', 'ASC'); break;
				case '+lastUsedAt': query.orderBy('token.lastUsedAt', 'DESC'); break;
				case '-lastUsedAt': query.orderBy('token.lastUsedAt', 'ASC'); break;
				default: query.orderBy('token.id', 'ASC'); break;
			}

			const tokens = await query.getMany();

			return await Promise.all(tokens.map(token => ({
				id: token.id,
				name: token.name ?? token.app?.name,
				createdAt: this.idService.parse(token.id).date.toISOString(),
				lastUsedAt: token.lastUsedAt?.toISOString(),
				permission: token.permission,
			})));
		});
	}
}
