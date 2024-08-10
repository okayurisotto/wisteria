/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ReversiService } from '@/core/ReversiService.js';
import { ReversiGameEntityService } from '@/core/entities/ReversiGameEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ReversiGameDetailedSchema } from '@/models/zod/reversi-game.js';

export const meta = {
	errors: {
		noSuchGame: {
			message: 'No such game.',
			code: 'NO_SUCH_GAME',
			id: '8fb05624-b525-43dd-90f7-511852bdfeee',
		},
	},

	res: z.object({
		desynced: z.boolean().optional(),
		game: ReversiGameDetailedSchema.nullable().optional(),
	}),
} as const;

export const paramDef = z.object({
	gameId: IdSchema,
	crc32: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly reversiService: ReversiService,
		private readonly reversiGameEntityService: ReversiGameEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const game = await this.reversiService.checkCrc(ps.gameId, ps.crc32);
			if (game) {
				return {
					desynced: true,
					game: await this.reversiGameEntityService.packDetail(game),
				};
			} else {
				return {
					desynced: false,
				};
			}
		});
	}
}
