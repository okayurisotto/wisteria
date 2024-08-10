/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { MetaService } from '@/core/MetaService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin', 'role'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',
} as const;

export const paramDef = z.object({
	policies: z.record(z.string(), z.unknown()),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly metaService: MetaService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps) => {
			await this.metaService.update({ policies: ps.policies });
		});
	}
}
