/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { ClipNotesRepository, ClipsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['clips', 'notes'],

	requireCredential: false,

	res: ClipSchema.array(),

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '47db1a1c-b0af-458d-8fb4-986e4efafe1e',
		},
	},
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		@Inject(DI.clipNotesRepository)
		private readonly clipNotesRepository: ClipNotesRepository,

		private readonly clipEntityService: ClipEntityService,
		private readonly getterService: GetterService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch((err: unknown) => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			const clipNotes = await this.clipNotesRepository.findBy({
				noteId: note.id,
			});

			const clips = await this.clipsRepository.findBy({
				id: In(clipNotes.map(x => x.clipId)),
				isPublic: true,
			});

			return await this.clipEntityService.packMany(clips, me);
		});
	}
}
