/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { URL } from 'node:url';
import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RelayService } from '@/core/RelayService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:relays',

	errors: {
		invalidUrl: {
			message: 'Invalid URL',
			code: 'INVALID_URL',
			id: 'fb8c92d3-d4e5-44e7-b3d4-800d5cef8b2c',
		},
	},

	res: z.object({
		id: IdSchema.optional(),
		inbox: z.string()/* format: url */.optional(),
		status: z.enum(['requesting', 'accepted', 'rejected']).default('requesting'),
	}),
} as const;

export const paramDef = z.object({
	inbox: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly relayService: RelayService,
	) {
		super(meta, paramDef, async (ps) => {
			try {
				if (new URL(ps.inbox).protocol !== 'https:') throw new Error('https only');
			} catch {
				throw new ApiError(meta.errors.invalidUrl);
			}

			return await this.relayService.addRelay(ps.inbox);
		});
	}
}
