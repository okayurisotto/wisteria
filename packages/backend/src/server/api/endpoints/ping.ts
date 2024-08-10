/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { z } from 'zod';

export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: z.object({
		pong: z.number().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
	) {
		super(meta, paramDef, async () => {
			return {
				pong: Date.now(),
			};
		});
	}
}
