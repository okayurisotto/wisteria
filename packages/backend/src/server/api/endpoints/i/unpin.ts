/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NotePiningService } from '@/core/NotePiningService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { MeDetailedSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['account', 'notes'],

	requireCredential: true,

	kind: 'write:account',

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '454170ce-9d63-4a43-9da1-ea10afe81e21',
		},
	},

	res: MeDetailedSchema,
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly userEntityService: UserEntityService,
		private readonly notePiningService: NotePiningService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.notePiningService.removePinned(me, ps.noteId).catch((err: unknown) => {
				if (err.id === 'b302d4cf-c050-400a-bbb3-be208681f40c') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			return await this.userEntityService.pack(me.id, me, {
				schema: 'MeDetailed',
			});
		});
	}
}
