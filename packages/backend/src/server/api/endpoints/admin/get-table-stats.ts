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
	kind: 'read:admin:table-stats',

	tags: ['admin'],

	res: z.record(z.string(), z.object({
		count: z.number(),
		size: z.number(),
	}))/* example: {"migrations":{"count":66,"size":32768}} */,
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.db)
		private readonly db: DataSource,
	) {
		super(meta, paramDef, async () => {
			const sizes = await this.db.query(`
			SELECT relname AS "table", reltuples as "count", pg_total_relation_size(C.oid) AS "size"
			FROM pg_class C LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
			WHERE nspname NOT IN ('pg_catalog', 'information_schema')
				AND C.relkind <> 'i'
				AND nspname !~ '^pg_toast';`)
				.then((recs) => {
					const res = {} as Record<string, { count: number; size: number }>;
					for (const rec of recs) {
						res[rec.table] = {
							count: parseInt(rec.count, 10),
							size: parseInt(rec.size, 10),
						};
					}
					return res;
				});

			return sizes;
		});
	}
}
