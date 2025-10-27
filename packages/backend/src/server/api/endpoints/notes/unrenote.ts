/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as ms from '@/misc/ms.js';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, NotesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteDeleteService } from '@/core/NoteDeleteService.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	kind: 'write:notes',

	limit: {
		duration: ms.hours(1),
		max: 300,
		minInterval: ms.seconds(1),
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'efd4a259-2442-496b-8dd7-b255aa1a160f',
		},
	},
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly getterService: GetterService,
		private readonly noteDeleteService: NoteDeleteService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch((err: unknown) => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			const renotes = await this.notesRepository.findBy({
				userId: me.id,
				renoteId: note.id,
			});

			for (const note of renotes) {
				this.noteDeleteService.delete(await this.usersRepository.findOneByOrFail({ id: me.id }), note);
			}
		});
	}
}
