/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IdService } from '@/core/IdService.js';
import type { MiUser } from '@/models/User.js';
import type { MiBlocking } from '@/models/Blocking.js';
import { QueueService } from '@/core/QueueService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import type { FollowRequestsRepository, BlockingsRepository, UserListsRepository, UserListMembershipsRepository } from '@/models/_.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { WebhookService } from '@/core/WebhookService.js';
import { bindThis } from '@/decorators.js';
import { UserFollowingService } from '@/core/UserFollowingService.js';

@Injectable()
export class UserBlockingBlockService implements OnModuleInit {
	private userFollowingService!: UserFollowingService;

	constructor(
		private readonly moduleRef: ModuleRef,

		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		@Inject(DI.userListMembershipsRepository)
		private readonly userListMembershipsRepository: UserListMembershipsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly idService: IdService,
		private readonly queueService: QueueService,
		private readonly globalEventService: GlobalEventService,
		private readonly webhookService: WebhookService,
		private readonly apRendererService: ApRendererService,
	) {}

	onModuleInit() {
		this.userFollowingService = this.moduleRef.get('UserFollowingService');
	}

	@bindThis
	public async block(blocker: MiUser, blockee: MiUser, silent = false): Promise<void> {
		await Promise.all([
			this.cancelRequest(blocker, blockee, silent),
			this.cancelRequest(blockee, blocker, silent),
			this.userFollowingService.unfollow(blocker, blockee, silent),
			this.userFollowingService.unfollow(blockee, blocker, silent),
			this.removeFromList(blockee, blocker),
		]);

		const blocking: MiBlocking = {
			id: this.idService.gen(),
			blocker,
			blockerId: blocker.id,
			blockee,
			blockeeId: blockee.id,
		};

		await this.blockingsRepository.insert(blocking);

		if (this.userEntityService.isLocalUser(blocker) && this.userEntityService.isRemoteUser(blockee)) {
			const content = this.apRendererService.addContext(this.apRendererService.renderBlock(blocking));
			await this.queueService.deliver(blocker, content, blockee.inbox, false);
		}
	}

	@bindThis
	private async cancelRequest(follower: MiUser, followee: MiUser, silent: boolean): Promise<void> {
		const request = await this.followRequestsRepository.findOneBy({
			followeeId: followee.id,
			followerId: follower.id,
		});

		if (request === null) return;

		await this.followRequestsRepository.delete({
			followeeId: followee.id,
			followerId: follower.id,
		});

		if (this.userEntityService.isLocalUser(followee)) {
			const packedUser = await this.userEntityService.pack(followee, followee, {
				schema: 'MeDetailed',
			});
			this.globalEventService.publishMainStream(followee.id, 'meUpdated', packedUser);
		}

		if (this.userEntityService.isLocalUser(follower) && !silent) {
			const packedUser = await this.userEntityService.pack(followee, follower, {
				schema: 'UserDetailedNotMe',
			});
			this.globalEventService.publishMainStream(follower.id, 'unfollow', packedUser);

			const allWebhooks = await this.webhookService.getActiveWebhooks();
			const webhooks = allWebhooks.filter(webhook => {
				return webhook.userId === follower.id && webhook.on.includes('unfollow');
			});
			for (const webhook of webhooks) {
				await this.queueService.webhookDeliver(webhook, 'unfollow', { user: packedUser });
			}
		}

		// リモートにフォローリクエストをしていたらUndoFollow送信
		if (
			this.userEntityService.isLocalUser(follower) &&
			this.userEntityService.isRemoteUser(followee)
		) {
			const content = this.apRendererService.addContext(
				this.apRendererService.renderUndo(
					this.apRendererService.renderFollow(follower, followee),
					follower,
				),
			);
			await this.queueService.deliver(follower, content, followee.inbox, false);
		}

		// リモートからフォローリクエストを受けていたらReject送信
		if (
			this.userEntityService.isRemoteUser(follower) &&
			this.userEntityService.isLocalUser(followee)
		) {
			const content = this.apRendererService.addContext(
				this.apRendererService.renderReject(
					this.apRendererService.renderFollow(follower, followee, request.requestId ?? undefined),
					followee,
				),
			);
			await this.queueService.deliver(followee, content, follower.inbox, false);
		}
	}

	@bindThis
	private async removeFromList(listOwner: MiUser, user: MiUser) {
		const userLists = await this.userListsRepository.findBy({
			userId: listOwner.id,
		});

		for (const userList of userLists) {
			await this.userListMembershipsRepository.delete({
				userListId: userList.id,
				userId: user.id,
			});
		}
	}
}
