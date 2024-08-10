/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RelayService } from '@/core/RelayService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:relays',
} as const;

export const paramDef = z.object({
	inbox: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly relayService: RelayService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.relayService.removeRelay(ps.inbox);
		});
	}
}
