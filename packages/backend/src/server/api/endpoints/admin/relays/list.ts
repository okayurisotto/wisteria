/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RelayService } from '@/core/RelayService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:relays',

	res: z.object({
		id: IdSchema.optional(),
		inbox: z.string()/* format: url */.optional(),
		status: z.enum(['requesting', 'accepted', 'rejected']).default('requesting'),
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly relayService: RelayService,
	) {
		super(meta, paramDef, async () => {
			return await this.relayService.listRelay();
		});
	}
}
