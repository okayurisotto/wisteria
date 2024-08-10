/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository } from '@/models/_.js';
import { QueueService } from '@/core/QueueService.js';
import { UserSuspendService } from '@/core/UserSuspendService.js';
import { DI } from '@/di-symbols.js';
import { isLocalUser } from '@/misc/isLocalUser.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:account',
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly queueService: QueueService,
		private readonly userSuspendService: UserSuspendService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({ id: ps.userId });

			if (user == null) {
				throw new Error('user not found');
			}

			if (user.isRoot) {
				throw new Error('cannot delete a root account');
			}

			if (isLocalUser(user)) {
				// 物理削除する前にDelete activityを送信する
				await this.userSuspendService.doPostSuspend(user).catch(() => {});

				this.queueService.createDeleteAccountJob(user, {
					soft: false,
				});
			} else {
				this.queueService.createDeleteAccountJob(user, {
					soft: true, // リモートユーザーの削除は、完全にDBから物理削除してしまうと再度連合してきてアカウントが復活する可能性があるため、soft指定する
				});
			}

			await this.usersRepository.update(user.id, {
				isDeleted: true,
			});
		});
	}
}
