/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/core/chart/core.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import InstanceChart from '@/core/chart/charts/instance.js';
import { schema } from '@/core/chart/charts/entities/instance.js';
import { z } from 'zod';

export const meta = {
	tags: ['charts'],

	res: getJsonSchema(schema),

	allowGet: true,
	cacheSec: 60 * 60,
} as const;

export const paramDef = z.object({
	span: z.enum(['day', 'hour']),
	limit: z.coerce.number().int().min(1).max(500).default(30),
	offset: z.coerce.number().int().nullable().default(null),
	host: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly instanceChart: InstanceChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.instanceChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null, ps.host);
		});
	}
}
