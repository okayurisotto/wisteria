/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as ms from '@/misc/ms.js';
import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ReactionDeleteService } from '@/core/ReactionDeleteService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['reactions', 'notes'],

	requireCredential: true,

	kind: 'write:reactions',

	limit: {
		duration: ms.hours(1),
		max: 60,
		minInterval: ms.seconds(3),
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '764d9fce-f9f2-4a0e-92b1-6ceac9a7ad37',
		},

		notReacted: {
			message: 'You are not reacting to that note.',
			code: 'NOT_REACTED',
			id: '92f4426d-4196-4125-aa5b-02943e2ec8fc',
		},
	},
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly getterService: GetterService,
		private readonly reactionDeleteService: ReactionDeleteService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch((err: unknown) => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});
			await this.reactionDeleteService.delete(me, note).catch((err: unknown) => {
				if (err.id === '60527ec9-b4cb-4a88-a6bd-32d3ad26817d') throw new ApiError(meta.errors.notReacted);
				throw err;
			});
		});
	}
}
