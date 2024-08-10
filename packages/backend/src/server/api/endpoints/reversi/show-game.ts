/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ReversiService } from '@/core/ReversiService.js';
import { ReversiGameEntityService } from '@/core/entities/ReversiGameEntityService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ReversiGameDetailedSchema } from '@/models/zod/reversi-game.js';

export const meta = {
	requireCredential: false,

	errors: {
		noSuchGame: {
			message: 'No such game.',
			code: 'NO_SUCH_GAME',
			id: 'f13a03db-fae1-46c9-87f3-43c8165419e1',
		},
	},

	res: ReversiGameDetailedSchema,
} as const;

export const paramDef = z.object({
	gameId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly reversiService: ReversiService,
		private readonly reversiGameEntityService: ReversiGameEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const game = await this.reversiService.get(ps.gameId);

			if (game == null) {
				throw new ApiError(meta.errors.noSuchGame);
			}

			return await this.reversiGameEntityService.packDetail(game);
		});
	}
}
