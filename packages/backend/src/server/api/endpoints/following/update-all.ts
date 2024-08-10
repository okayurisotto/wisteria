/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { FollowingsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['following', 'users'],

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	requireCredential: true,

	kind: 'write:following',
} as const;

export const paramDef = z.object({
	notify: z.enum(['normal', 'none']).optional(),
	withReplies: z.boolean().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.followingsRepository.update({
				followerId: me.id,
			}, {
				notify: ps.notify != null ? (ps.notify === 'none' ? null : ps.notify) : undefined,
				withReplies: ps.withReplies != null ? ps.withReplies : undefined,
			});

			return;
		});
	}
}
