/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ApResolverService } from '@/core/activitypub/ApResolverService.js';
import { z } from 'zod';

export const meta = {
	tags: ['federation'],

	requireCredential: true,
	kind: 'read:federation',

	limit: {
		duration: ms('1hour'),
		max: 30,
	},

	errors: {
	},

	res: z.record(z.string(), z.unknown()),
} as const;

export const paramDef = z.object({
	uri: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly apResolverService: ApResolverService,
	) {
		super(meta, paramDef, async (ps) => {
			const resolver = this.apResolverService.createResolver();
			const object = await resolver.resolve(ps.uri);
			return object;
		});
	}
}
