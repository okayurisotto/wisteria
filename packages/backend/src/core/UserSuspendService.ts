/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Not, IsNull } from 'typeorm';
import type { FollowingsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { QueueService } from '@/core/QueueService.js';
import { DI } from '@/di-symbols.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

@Injectable()
export class UserSuspendService {
	constructor(
		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		private userEntityService: UserEntityService,
		private queueService: QueueService,
		private apRendererService: ApRendererService,
	) {
	}

	public async doPostSuspend(user: { id: MiUser['id']; host: MiUser['host'] }): Promise<void> {
		if (this.userEntityService.isLocalUser(user)) {
			// 知り得る全SharedInboxにDelete配信
			const content = this.apRendererService.addContext(this.apRendererService.renderDelete(this.userEntityService.genLocalUserUri(user.id), user));

			const queue: string[] = [];

			const followings = await this.followingsRepository.find({
				where: [
					{ followerSharedInbox: Not(IsNull()) },
					{ followeeSharedInbox: Not(IsNull()) },
				],
				select: ['followerSharedInbox', 'followeeSharedInbox'],
			});

			const inboxes = followings.map(x => x.followerSharedInbox ?? x.followeeSharedInbox);

			for (const inbox of inboxes) {
				if (inbox != null && !queue.includes(inbox)) queue.push(inbox);
			}

			for (const inbox of queue) {
				this.queueService.deliver(user, content, inbox, true);
			}
		}
	}

	public async doPostUnsuspend(user: MiUser): Promise<void> {
		if (this.userEntityService.isLocalUser(user)) {
			// 知り得る全SharedInboxにUndo Delete配信
			const content = this.apRendererService.addContext(this.apRendererService.renderUndo(this.apRendererService.renderDelete(this.userEntityService.genLocalUserUri(user.id), user), user));

			const queue: string[] = [];

			const followings = await this.followingsRepository.find({
				where: [
					{ followerSharedInbox: Not(IsNull()) },
					{ followeeSharedInbox: Not(IsNull()) },
				],
				select: ['followerSharedInbox', 'followeeSharedInbox'],
			});

			const inboxes = followings.map(x => x.followerSharedInbox ?? x.followeeSharedInbox);

			for (const inbox of inboxes) {
				if (inbox != null && !queue.includes(inbox)) queue.push(inbox);
			}

			for (const inbox of queue) {
				this.queueService.deliver(user as any, content, inbox, true);
			}
		}
	}
}
