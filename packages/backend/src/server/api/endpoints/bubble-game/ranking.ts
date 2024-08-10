/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { BubbleGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserLiteSchema } from '@/models/zod/user-lite.js';

export const meta = {
	allowGet: true,
	cacheSec: 60,

	errors: {
	},

	res: z.object({
		id: IdSchema.optional(),
		score: z.number().int().optional(),
		user: UserLiteSchema.optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	gameMode: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.bubbleGameRecordsRepository)
		private readonly bubbleGameRecordsRepository: BubbleGameRecordsRepository,

		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const records = await this.bubbleGameRecordsRepository.find({
				where: {
					gameMode: ps.gameMode,
					seededAt: MoreThan(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)),
				},
				order: {
					score: 'DESC',
				},
				take: 10,
				relations: ['user'],
			});

			const users = await this.userEntityService.packMany(records.map(r => r.user!), null);

			return records.map(r => ({
				id: r.id,
				score: r.score,
				user: users.find(u => u.id === r.user!.id),
			}));
		});
	}
}
