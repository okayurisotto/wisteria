/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/core/chart/core.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import NotesChart from '@/core/chart/charts/notes.js';
import { schema } from '@/core/chart/charts/entities/notes.js';
import { z } from 'zod';

export const meta = {
	tags: ['charts', 'notes'],

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
		private readonly notesChart: NotesChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.notesChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null);
		});
	}
}
