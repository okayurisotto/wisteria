/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ReversiService } from '@/core/ReversiService.js';
import { ReversiGameEntityService } from '@/core/entities/ReversiGameEntityService.js';
import { ApiError } from '../../error.js';
import { GetterService } from '../../GetterService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ReversiGameDetailedSchema } from '@/models/zod/reversi-game.js';

export const meta = {
	requireCredential: true,

	kind: 'write:account',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '0b4f0559-b484-4e31-9581-3f73cee89b28',
		},

		isYourself: {
			message: 'Target user is yourself.',
			code: 'TARGET_IS_YOURSELF',
			id: '96fd7bd6-d2bc-426c-a865-d055dcd2828e',
		},
	},

	res: ReversiGameDetailedSchema,
} as const;

export const paramDef = z.object({
	userId: IdSchema.nullable().optional(),
	noIrregularRules: z.boolean().default(false),
	multiple: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly getterService: GetterService,
		private readonly reversiService: ReversiService,
		private readonly reversiGameEntityService: ReversiGameEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.userId === me.id) throw new ApiError(meta.errors.isYourself);

			const target = ps.userId
				? await this.getterService.getUser(ps.userId).catch((err: unknown) => {
					if (err.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
					throw err;
				})
				: null;

			const game = target
				? await this.reversiService.matchSpecificUser(me, target, ps.multiple)
				: await this.reversiService.matchAnyUser(me, { noIrregularRules: ps.noIrregularRules }, ps.multiple);

			if (game == null) return;

			return await this.reversiGameEntityService.packDetail(game);
		});
	}
}
