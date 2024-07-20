/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { InstancesRepository } from '@/models/_.js';
import type { MiInstance } from '@/models/Instance.js';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';
import { UtilityService } from '@/core/UtilityService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class FederatedInstanceService {
	constructor(
		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		private utilityService: UtilityService,
		private idService: IdService,
	) {}

	@bindThis
	public async fetch(host: string): Promise<MiInstance> {
		host = this.utilityService.toPuny(host);

		const index = await this.instancesRepository.findOneBy({ host });

		if (index == null) {
			const i = await this.instancesRepository.insert({
				id: this.idService.gen(),
				host,
				firstRetrievedAt: new Date(),
			}).then(x => this.instancesRepository.findOneByOrFail(x.identifiers[0]));

			return i;
		} else {
			return index;
		}
	}

	@bindThis
	public async update(id: MiInstance['id'], data: Partial<MiInstance>): Promise<void> {
		await this.instancesRepository.createQueryBuilder().update()
			.set(data)
			.where('id = :id', { id })
			.returning('*')
			.execute()
			.then((response) => {
				return response.raw[0];
			});
	}
}
