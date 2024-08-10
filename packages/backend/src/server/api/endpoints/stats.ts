/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { InstancesRepository, NoteReactionsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import NotesChart from '@/core/chart/charts/notes.js';
import UsersChart from '@/core/chart/charts/users.js';
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

		private readonly notesChart: NotesChart,
		private readonly usersChart: UsersChart,
	) {
		super(meta, paramDef, async () => {
			const notesChart = await this.notesChart.getChart('hour', 1, null);
			const notesCount = notesChart.local.total[0] + notesChart.remote.total[0];
			const originalNotesCount = notesChart.local.total[0];

			const usersChart = await this.usersChart.getChart('hour', 1, null);
			const usersCount = usersChart.local.total[0] + usersChart.remote.total[0];
			const originalUsersCount = usersChart.local.total[0];

			const [
				reactionsCount,
				// originalReactionsCount,
				instances,
			] = await Promise.all([
				this.noteReactionsRepository.count({ cache: 3600000 }), // 1 hour
				// this.noteReactionsRepository.count({ where: { userHost: IsNull() }, cache: 3600000 }),
				this.instancesRepository.count({ cache: 3600000 }),
			]);

			return {
				notesCount,
				originalNotesCount,
				usersCount,
				originalUsersCount,
				reactionsCount,
				// originalReactionsCount,
				instances,
				driveUsageLocal: 0,
				driveUsageRemote: 0,
			};
		});
	}
}
