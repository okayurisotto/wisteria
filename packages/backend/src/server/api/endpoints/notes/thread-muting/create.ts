/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import type { NotesRepository, NoteThreadMutingsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { GetterService } from '@/server/api/GetterService.js';
import { NoteReadService } from '@/core/NoteReadService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '5ff67ada-ed3b-2e71-8e87-a1a421e177d2',
		},
	},
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.noteThreadMutingsRepository)
		private readonly noteThreadMutingsRepository: NoteThreadMutingsRepository,

		private readonly getterService: GetterService,
		private readonly noteReadService: NoteReadService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch((err: unknown) => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			const mutedNotes = await this.notesRepository.find({
				where: [{
					id: note.threadId ?? note.id,
				}, {
					threadId: note.threadId ?? note.id,
				}],
			});

			await this.noteReadService.read(me.id, mutedNotes);

			await this.noteThreadMutingsRepository.insert({
				id: this.idService.gen(),
				threadId: note.threadId ?? note.id,
				userId: me.id,
			});
		});
	}
}
