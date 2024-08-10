/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/core/chart/core.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import PerUserDriveChart from '@/core/chart/charts/per-user-drive.js';
import { schema } from '@/core/chart/charts/entities/per-user-drive.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['charts', 'drive', 'users'],

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
		private readonly perUserDriveChart: PerUserDriveChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.perUserDriveChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null, ps.userId);
		});
	}
}
