/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { UsersRepository, DriveFilesRepository } from '@/models/_.js';
import type Logger from '@/logger.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { RemoteUserResolveService } from '@/core/RemoteUserResolveService.js';
import { DownloadService } from '@/core/DownloadService.js';
import { bindThis } from '@/decorators.js';
import { QueueService } from '@/core/QueueService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { DbUserImportJobData, DbUserImportToDbJobData } from '../types.js';
import type { Config } from '@/config.js';

@Injectable()
export class ImportBlockingProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private queueService: QueueService,
		private remoteUserResolveService: RemoteUserResolveService,
		private downloadService: DownloadService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('import-blocking');
	}

	@bindThis
	public async process(job: Bull.Job<DbUserImportJobData>): Promise<void> {
		this.logger.info(`Importing blocking of ${job.data.user.id} ...`);

		const user = await this.usersRepository.findOneBy({ id: job.data.user.id });
		if (user == null) {
			return;
		}

		const file = await this.driveFilesRepository.findOneBy({
			id: job.data.fileId,
		});
		if (file == null) {
			return;
		}

		const csv = await this.downloadService.downloadTextFile(file.url);
		const targets = csv.trim().split('\n');
		this.queueService.createImportBlockingToDbJob({ id: user.id }, targets);

		this.logger.succ('Import jobs created');
	}

	@bindThis
	public async processDb(job: Bull.Job<DbUserImportToDbJobData>): Promise<void> {
		const line = job.data.target;
		const user = job.data.user;

		try {
			const acct = line.split(',')[0].trim();
			const acctEntity = AcctEntity.parse(acct, this.config.host);

			// host部分が省略されている：危ない
			if (acctEntity.omitted) return;

			let target = await this.usersRepository.findOneBy({
				host: acctEntity.host ?? IsNull(),
				usernameLower: acctEntity.username.toLowerCase(),
			});

			// リモート && データベースにない：解決
			if (acctEntity.host === null && target == null) {
				target = await this.remoteUserResolveService.resolveUser(acctEntity);
			}

			if (target === null) {
				throw new Error(`Unable to resolve user: ${acctEntity.toLongString()}`);
			}

			// skip myself
			if (target.id === job.data.user.id) return;

			this.logger.info(`Block ${target.id} ...`);

			this.queueService.createBlockJob([{ from: { id: user.id }, to: { id: target.id }, silent: true }]);
		} catch (e) {
			this.logger.warn(`Error: ${e}`);
		}
	}
}
