/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { IdService } from '@/core/IdService.js';
import type { BubbleGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 120,
		minInterval: ms('30sec'),
	},

	errors: {
		invalidSeed: {
			message: 'Provided seed is invalid.',
			code: 'INVALID_SEED',
			id: 'eb627bc7-574b-4a52-a860-3c3eae772b88',
		},
	},
} as const;

export const paramDef = z.object({
	score: z.number().int().min(0),
	seed: z.string().min(1).max(1024),
	logs: z.number().array().array(),
	gameMode: z.string(),
	gameVersion: z.number().int(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.bubbleGameRecordsRepository)
		private readonly bubbleGameRecordsRepository: BubbleGameRecordsRepository,

		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const seedDate = new Date(parseInt(ps.seed, 10));
			const now = new Date();

			// シードが未来なのは通常のプレイではありえないので弾く
			if (seedDate.getTime() > now.getTime()) {
				throw new ApiError(meta.errors.invalidSeed);
			}

			// シードが古すぎる(5時間以上前)のも弾く
			if (seedDate.getTime() < now.getTime() - 1000 * 60 * 60 * 5) {
				throw new ApiError(meta.errors.invalidSeed);
			}

			await this.bubbleGameRecordsRepository.insert({
				id: this.idService.gen(now.getTime()),
				seed: ps.seed,
				seededAt: seedDate,
				userId: me.id,
				score: ps.score,
				logs: ps.logs,
				gameMode: ps.gameMode,
				gameVersion: ps.gameVersion,
				isVerified: false,
			});
		});
	}
}
