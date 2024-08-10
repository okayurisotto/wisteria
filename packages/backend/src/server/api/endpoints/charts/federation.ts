/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/core/chart/core.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import FederationChart from '@/core/chart/charts/federation.js';
import { schema } from '@/core/chart/charts/entities/federation.js';
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
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly federationChart: FederationChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.federationChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null);
		});
	}
}
