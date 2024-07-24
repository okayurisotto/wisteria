/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { UsersRepository, DriveFilesRepository, UserListMembershipsRepository, UserListsRepository } from '@/models/_.js';
import type Logger from '@/logger.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { RemoteUserResolveService } from '@/core/RemoteUserResolveService.js';
import { DownloadService } from '@/core/DownloadService.js';
import { UserListService } from '@/core/UserListService.js';
import { IdService } from '@/core/IdService.js';
import { bindThis } from '@/decorators.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { DbUserImportJobData } from '../types.js';
import type { Config } from '@/config.js';

@Injectable()
export class ImportUserListsProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.userListsRepository)
		private userListsRepository: UserListsRepository,

		@Inject(DI.userListMembershipsRepository)
		private userListMembershipsRepository: UserListMembershipsRepository,

		private idService: IdService,
		private userListService: UserListService,
		private remoteUserResolveService: RemoteUserResolveService,
		private downloadService: DownloadService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('import-user-lists');
	}

	@bindThis
	public async process(job: Bull.Job<DbUserImportJobData>): Promise<void> {
		this.logger.info(`Importing user lists of ${job.data.user.id} ...`);

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

		let linenum = 0;

		for (const line of csv.trim().split('\n')) {
			linenum++;

			try {
				const listName = line.split(',')[0].trim();
				const acct = line.split(',')[1].trim();
				const acctEntity = AcctEntity.parse(acct, this.config.host);

				let list = await this.userListsRepository.findOneBy({
					userId: user.id,
					name: listName,
				});

				if (list === null) {
					list = await this.userListsRepository.insert({
						id: this.idService.gen(),
						userId: user.id,
						name: listName,
					}).then(x => this.userListsRepository.findOneByOrFail(x.identifiers[0]));
				}

				let target = await this.usersRepository.findOneBy({
					host: acctEntity.host ?? IsNull(),
					usernameLower: acctEntity.username.toLowerCase(),
				});

				if (acctEntity.host === null && target === null) {
					target = await this.remoteUserResolveService.resolveUser(acctEntity);
				}

				if (target === null) continue;

				if (await this.userListMembershipsRepository.findOneBy({ userListId: list!.id, userId: target.id }) != null) continue;

				this.userListService.addMember(target, list!, user);
			} catch (e) {
				this.logger.warn(`Error in line:${linenum} ${e}`);
			}
		}

		this.logger.succ('Imported');
	}
}
