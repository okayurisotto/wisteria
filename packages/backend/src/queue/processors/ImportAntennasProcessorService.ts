/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable, Inject } from '@nestjs/common';
import z from 'zod';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { Logger } from '@/logger.js';
import type { AntennasRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type { DBAntennaImportJobData } from '../types.js';
import type * as Bull from 'bullmq';

const validate = z.object({
	name: z.string().min(1).max(100),
	src: z.enum(['home', 'all', 'users', 'list']),
	userListAccts: z.string().array().nullable().optional(),
	keywords: z.string().array().array(),
	excludeKeywords: z.string().array().array(),
	users: z.string().array(),
	caseSensitive: z.boolean(),
	localOnly: z.boolean().default(false),
	withReplies: z.boolean(),
	withFile: z.boolean(),
	notify: z.boolean(),
});

@Injectable()
export class ImportAntennasProcessorService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.antennasRepository)
		private readonly antennasRepository: AntennasRepository,

		private readonly queueLoggerService: QueueLoggerService,
		private readonly idService: IdService,
		private readonly globalEventService: GlobalEventService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('import-antennas');
	}

	public async process(job: Bull.Job<DBAntennaImportJobData>): Promise<void> {
		const now = new Date();
		try {
			for (const raw of job.data.antenna) {
				const { success, data: antenna } = validate.safeParse(raw);

				if (!success) {
					this.logger.warn('Validation Failed');
					continue;
				}

				if (antenna.keywords.length === 0 || antenna.keywords[0].every(x => x === '')) {
					continue;
				}

				const result = await this.antennasRepository.insert({
					id: this.idService.gen(now.getTime()),
					lastUsedAt: now,
					userId: job.data.user.id,
					name: antenna.name,
					src: antenna.src === 'list' && antenna.userListAccts ? 'users' : antenna.src,
					userListId: null,
					keywords: antenna.keywords,
					excludeKeywords: antenna.excludeKeywords,
					users: (antenna.src === 'list' && antenna.userListAccts != null ? antenna.userListAccts : antenna.users).filter((x) => x),
					caseSensitive: antenna.caseSensitive,
					localOnly: antenna.localOnly,
					withReplies: antenna.withReplies,
					withFile: antenna.withFile,
					notify: antenna.notify,
				}).then(x => this.antennasRepository.findOneByOrFail(x.identifiers[0]));

				this.logger.succ(`Antenna created: ${result.id}`);
				this.globalEventService.publishInternalEvent('antennaCreated', result);
			}
		} catch (err: unknown) {
			this.logger.error(err);
		}
	}
}
