/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { RetentionAggregationsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: z.object({
		createdAt: z.string()/* format: date-time */,
		users: z.number(),
		data: z.record(z.string(), z.number()),
	}).array(),

	allowGet: true,
	cacheSec: 60 * 60,
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.retentionAggregationsRepository)
		private readonly retentionAggregationsRepository: RetentionAggregationsRepository,
	) {
		super(meta, paramDef, async () => {
			const records = await this.retentionAggregationsRepository.find({
				order: {
					id: 'DESC',
				},
				take: 30,
			});

			return records.map(record => ({
				createdAt: record.createdAt.toISOString(),
				users: record.usersCount,
				data: record.data,
			}));
		});
	}
}
