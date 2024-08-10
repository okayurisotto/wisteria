/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as os from 'node:os';
import si from 'systeminformation';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as Redis from 'ioredis';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:server-info',

	tags: ['admin', 'meta'],

	res: z.object({
		machine: z.string().optional(),
		os: z.string()/* example: "linux" */.optional(),
		node: z.string().optional(),
		psql: z.string().optional(),
		cpu: z.object({
			model: z.string().optional(),
			cores: z.number().optional(),
		}),
		mem: z.object({
			total: z.number()/* format: bytes */.optional(),
		}),
		fs: z.object({
			total: z.number()/* format: bytes */.optional(),
			used: z.number()/* format: bytes */.optional(),
		}),
		net: z.object({
			interface: z.string()/* example: "eth0" */.optional(),
		}),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.db)
		private readonly db: DataSource,

		@Inject(DI.redis)
		private readonly redisClient: Redis.Redis,

	) {
		super(meta, paramDef, async () => {
			const memStats = await si.mem();
			const fsStats = await si.fsSize();
			const netInterface = await si.networkInterfaceDefault();

			const redisServerInfo = await this.redisClient.info('Server');
			const m = redisServerInfo.match(new RegExp('^redis_version:(.*)', 'm'));
			const redis_version = m?.[1];

			return {
				machine: os.hostname(),
				os: os.platform(),
				node: process.version,
				psql: await this.db.query('SHOW server_version').then(x => x[0].server_version),
				redis: redis_version,
				cpu: {
					model: os.cpus()[0].model,
					cores: os.cpus().length,
				},
				mem: {
					total: memStats.total,
				},
				fs: {
					total: fsStats[0].size,
					used: fsStats[0].used,
				},
				net: {
					interface: netInterface,
				},
			};
		});
	}
}
