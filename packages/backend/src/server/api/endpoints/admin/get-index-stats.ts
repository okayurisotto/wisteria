/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:index-stats',

	tags: ['admin'],
	res: z.object({
		tablename: z.string().optional(),
		indexname: z.string().optional(),
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.db)
		private readonly db: DataSource,
	) {
		super(meta, paramDef, async () => {
			const stats = await this.db.query('SELECT * FROM pg_indexes;').then((recs) => {
				const res = [] as { tablename: string; indexname: string }[];
				for (const rec of recs) {
					res.push(rec);
				}
				return res;
			});

			return stats;
		});
	}
}
