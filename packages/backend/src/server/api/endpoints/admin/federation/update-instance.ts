/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { InstancesRepository } from '@/models/_.js';
import { UtilityService } from '@/core/UtilityService.js';
import { DI } from '@/di-symbols.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:federation',
} as const;

export const paramDef = z.object({
	host: z.string(),
	isSuspended: z.boolean(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		private readonly utilityService: UtilityService,
		private readonly federatedInstanceService: FederatedInstanceService,
		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const instance = await this.instancesRepository.findOneBy({ host: this.utilityService.toPuny(ps.host) });

			if (instance == null) {
				throw new Error('instance not found');
			}

			await this.federatedInstanceService.update(instance.id, {
				isSuspended: ps.isSuspended,
			});

			if (instance.isSuspended !== ps.isSuspended) {
				if (ps.isSuspended) {
					this.moderationLogService.log(me, 'suspendRemoteInstance', {
						id: instance.id,
						host: instance.host,
					});
				} else {
					this.moderationLogService.log(me, 'unsuspendRemoteInstance', {
						id: instance.id,
						host: instance.host,
					});
				}
			}
		});
	}
}
