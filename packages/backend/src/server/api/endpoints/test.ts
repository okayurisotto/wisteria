/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['non-productive'],

	description: 'Endpoint for testing input validation.',

	requireCredential: false,

	res: z.object({
		id: IdSchema.optional(),
		required: z.boolean().optional(),
		string: z.string().optional(),
		default: z.string().optional(),
		nullableDefault: z.string().nullable().optional().default('hello'),
	}),
} as const;

export const paramDef = z.object({
	required: z.boolean(),
	string: z.string().optional(),
	default: z.string().default('hello'),
	nullableDefault: z.string().nullable().default('hello'),
	id: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
	) {
		super(meta, paramDef, async (ps) => {
			return ps;
		});
	}
}
