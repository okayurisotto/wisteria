/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { SigninsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { SigninEntityService } from '@/core/entities/SigninEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { SigninSchema } from '@/models/zod/signin.js';

export const meta = {
	requireCredential: true,
	secure: true,

	res: SigninSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.signinsRepository)
		private readonly signinsRepository: SigninsRepository,

		private readonly signinEntityService: SigninEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.signinsRepository.createQueryBuilder('signin'), ps.sinceId, ps.untilId)
				.andWhere('signin.userId = :meId', { meId: me.id });

			const history = await query.limit(ps.limit).getMany();

			return await Promise.all(history.map(record => this.signinEntityService.pack(record)));
		});
	}
}
