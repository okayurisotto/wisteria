/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository } from '@/models/_.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { UserSuspendService } from '@/core/UserSuspendService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:unsuspend-user',
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userSuspendService: UserSuspendService,
		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({ id: ps.userId });

			if (user == null) {
				throw new Error('user not found');
			}

			await this.usersRepository.update(user.id, {
				isSuspended: false,
			});

			this.moderationLogService.log(me, 'unsuspend', {
				userId: user.id,
				userUsername: user.username,
				userHost: user.host,
			});

			this.userSuspendService.doPostUnsuspend(user);
		});
	}
}
