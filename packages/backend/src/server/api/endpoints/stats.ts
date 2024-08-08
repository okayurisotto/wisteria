/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { InstancesRepository, NoteReactionsRepository, NotesRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: z.object({
		notesCount: z.number().optional(),
		originalNotesCount: z.number().optional(),
		usersCount: z.number().optional(),
		originalUsersCount: z.number().optional(),
		instances: z.number().optional(),
		driveUsageLocal: z.number().optional(),
		driveUsageRemote: z.number().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private readonly notesRespository: NotesRepository,
	) {
		super(meta, paramDef, async () => {
			const [
				notesCount,
				originalNotesCount,
				usersCount,
				originalUsersCount,
				reactionsCount,
				instances,
			] = await Promise.all([
				this.notesRespository.count({ cache: 3600000 }),
				this.notesRespository.count({ cache: 3600000, where: { user: { host: IsNull() } } }),
				this.usersRepository.count({ cache: 3600000 }),
				this.usersRepository.count({ cache: 3600000, where: { host: IsNull() } }),
				this.noteReactionsRepository.count({ cache: 3600000 }),
				this.instancesRepository.count({ cache: 3600000 }),
			]);

			return {
				notesCount,
				originalNotesCount,
				usersCount,
				originalUsersCount,
				reactionsCount,
				instances,
				driveUsageLocal: 0,
				driveUsageRemote: 0,
			};
		});
	}
}
