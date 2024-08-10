/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { endpoints } from '../endpoints.js';
import { z } from 'zod';

export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: z.object({
		params: z.object({
			name: z.string().optional(),
			type: z.string().optional(),
		}).array(),
	}).nullable(),
} as const;

export const paramDef = z.object({
	endpoint: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
	) {
		super(meta, paramDef, async (ps) => {
			const ep = endpoints.find(x => x.name === ps.endpoint);
			if (ep == null) return null;
			return {
				params: Object.entries(ep.params.properties ?? {}).map(([k, v]) => ({
					name: k,
					type: v.type ? v.type.charAt(0).toUpperCase() + v.type.slice(1) : 'string',
				})),
			};
		});
	}
}
