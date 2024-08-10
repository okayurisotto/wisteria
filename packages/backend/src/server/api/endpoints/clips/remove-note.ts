/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ClipService } from '@/core/ClipService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['account', 'notes', 'clips'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:account',

	errors: {
		noSuchClip: {
			message: 'No such clip.',
			code: 'NO_SUCH_CLIP',
			id: 'b80525c6-97f7-49d7-a42d-ebccd49cfd52',
		},

		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'aff017de-190e-434b-893e-33a9ff5049d8',
		},
	},
} as const;

export const paramDef = z.object({
	clipId: IdSchema,
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly clipService: ClipService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await this.clipService.removeNote(me, ps.clipId, ps.noteId);
			} catch (e) {
				if (e instanceof ClipService.NoSuchClipError) {
					throw new ApiError(meta.errors.noSuchClip);
				} else if (e instanceof ClipService.NoSuchNoteError) {
					throw new ApiError(meta.errors.noSuchNote);
				}
				throw e;
			}
		});
	}
}
