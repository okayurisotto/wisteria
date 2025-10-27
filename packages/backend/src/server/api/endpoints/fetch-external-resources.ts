/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'crypto';
import * as ms from '@/misc/ms.js';
import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { ApiError } from '../error.js';
import { z } from 'zod';

export const meta = {
	tags: ['meta'],

	requireCredential: true,
	secure: true,

	limit: {
		duration: ms.hours(1),
		max: 50,
	},

	errors: {
		invalidSchema: {
			message: 'External resource returned invalid schema.',
			code: 'EXT_RESOURCE_RETURNED_INVALID_SCHEMA',
			id: 'bb774091-7a15-4a70-9dc5-6ac8cf125856',
		},
		hashUnmached: {
			message: 'Hash did not match.',
			code: 'EXT_RESOURCE_HASH_DIDNT_MATCH',
			id: '693ba8ba-b486-40df-a174-72f8279b56a4',
		},
	},

	res: z.object({
		type: z.string().optional(),
		data: z.string().optional(),
	}),
} as const;

export const paramDef = z.object({
	url: z.string(),
	hash: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly httpRequestService: HttpRequestService,
	) {
		super(meta, paramDef, async (ps) => {
			const res = await this.httpRequestService.getJson<{
				type: string;
				data: string;
			}>(ps.url);

			if (!res.data || !res.type) {
				throw new ApiError(meta.errors.invalidSchema);
			}

			const resHash = createHash('sha512').update(res.data.replace(/\r\n/g, '\n')).digest('hex');
			if (resHash !== ps.hash) {
				throw new ApiError(meta.errors.hashUnmached);
			}

			return {
				type: res.type,
				data: res.data,
			};
		});
	}
}
