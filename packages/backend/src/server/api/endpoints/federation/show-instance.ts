/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { InstancesRepository } from '@/models/_.js';
import { InstanceEntityService } from '@/core/entities/InstanceEntityService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { FederationInstanceSchema } from '@/models/zod/federation-instance.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,

	res: FederationInstanceSchema.nullable(),
} as const;

export const paramDef = z.object({
	host: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		private readonly utilityService: UtilityService,
		private readonly instanceEntityService: InstanceEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const instance = await this.instancesRepository
				.findOneBy({ host: this.utilityService.toPuny(ps.host) });

			return instance ? await this.instanceEntityService.pack(instance) : null;
		});
	}
}
