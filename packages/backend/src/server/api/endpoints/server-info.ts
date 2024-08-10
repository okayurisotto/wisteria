/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as os from 'node:os';
import si from 'systeminformation';
import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { MetaService } from '@/core/MetaService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 1,

	tags: ['meta'],
	res: z.object({
		machine: z.string().optional(),
		cpu: z.object({
			model: z.string().optional(),
			cores: z.number().optional(),
		}),
		mem: z.object({
			total: z.number().optional(),
		}),
		fs: z.object({
			total: z.number().optional(),
			used: z.number().optional(),
		}),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly metaService: MetaService,
	) {
		super(meta, paramDef, async () => {
			if (!(await this.metaService.fetch()).enableServerMachineStats) return {
				machine: '?',
				cpu: {
					model: '?',
					cores: 0,
				},
				mem: {
					total: 0,
				},
				fs: {
					total: 0,
					used: 0,
				},
			};

			const memStats = await si.mem();
			const fsStats = await si.fsSize();

			return {
				machine: os.hostname(),
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
			};
		});
	}
}
