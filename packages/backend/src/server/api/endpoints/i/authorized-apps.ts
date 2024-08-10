/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	requireCredential: true,

	secure: true,

	res: z.object({
		id: IdSchema.optional(),
		name: z.string().optional(),
		callbackUrl: z.string().nullable().optional(),
		permission: z.string().array().refine(v => new Set(v).size === v.length).optional(),
		isAuthorized: z.boolean().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	offset: z.number().int().default(0),
	sort: z.enum(['desc', 'asc']).default('desc'),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Get tokens
			const tokens = await this.accessTokensRepository.find({
				where: {
					userId: me.id,
					appId: Not(IsNull()),
				},
				take: ps.limit,
				skip: ps.offset,
				order: {
					id: ps.sort === 'asc' ? 1 : -1,
				},
			});

			return await Promise.all(tokens.map(token => this.appEntityService.pack(token.appId!, me, {
				detail: true,
			})));
		});
	}
}
