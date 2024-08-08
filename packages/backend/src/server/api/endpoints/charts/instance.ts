/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/core/chart/core.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
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
	constructor() {
		super(meta, paramDef, async (ps) => {
			const dummy = new Array<number>(ps.limit).fill(0);

			return {
				drive: { decFiles: dummy, decUsage: dummy, incFiles: dummy, incUsage: dummy, totalFiles: dummy },
				followers: { dec: dummy, inc: dummy, total: dummy },
				following: { dec: dummy, inc: dummy, total: dummy },
				notes: { dec: dummy, diffs: { normal: dummy, renote: dummy, reply: dummy, withFile: dummy }, inc: dummy, total: dummy },
				requests: { failed: dummy, received: dummy, succeeded: dummy },
				users: { dec: dummy, inc: dummy, total: dummy },
			};
		});
	}
}
