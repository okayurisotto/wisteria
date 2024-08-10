/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { getJsonSchema } from '@/core/chart/core.js';
import PerUserFollowingChart from '@/core/chart/charts/per-user-following.js';
import { schema } from '@/core/chart/charts/entities/per-user-following.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['charts', 'users', 'following'],

	res: getJsonSchema(schema),

	allowGet: true,
	cacheSec: 60 * 60,
} as const;

export const paramDef = z.object({
	span: z.enum(['day', 'hour']),
	limit: z.coerce.number().int().min(1).max(500).default(30),
	offset: z.coerce.number().int().nullable().default(null),
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly perUserFollowingChart: PerUserFollowingChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.perUserFollowingChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null, ps.userId);
		});
	}
}
