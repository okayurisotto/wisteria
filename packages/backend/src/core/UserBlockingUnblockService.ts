/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MiUser } from '@/models/User.js';
import { QueueService } from '@/core/QueueService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import type { BlockingsRepository } from '@/models/_.js';
import Logger from '@/logger.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { CacheService } from '@/core/CacheService.js';

@Injectable()
export class UserBlockingUnblockService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		private readonly cacheService: CacheService,
		private readonly userEntityService: UserEntityService,
		private readonly queueService: QueueService,
		private readonly globalEventService: GlobalEventService,
		private readonly apRendererService: ApRendererService,
		private readonly loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('user-block');
	}

	@bindThis
	public async unblock(blocker: MiUser, blockee: MiUser) {
		const blocking = await this.blockingsRepository.findOneBy({
			blockerId: blocker.id,
			blockeeId: blockee.id,
		});

		if (blocking === null) {
			this.logger.warn(
				'ブロック解除がリクエストされましたがブロックしていませんでした',
			);
			return;
		}

		// Since we already have the blocker and blockee, we do not need to fetch
		// them in the query above and can just manually insert them here.
		blocking.blocker = blocker;
		blocking.blockee = blockee;

		await this.blockingsRepository.delete(blocking.id);

		await Promise.all([
			this.cacheService.userBlockingCache.refresh(blocker.id),
			this.cacheService.userBlockedCache.refresh(blockee.id),
		]);

		this.globalEventService.publishInternalEvent('blockingDeleted', {
			blockerId: blocker.id,
			blockeeId: blockee.id,
		});

		// deliver if remote blocking
		if (
			this.userEntityService.isLocalUser(blocker) &&
			this.userEntityService.isRemoteUser(blockee)
		) {
			const content = this.apRendererService.addContext(
				this.apRendererService.renderUndo(
					this.apRendererService.renderBlock(blocking),
					blocker,
				),
			);
			await this.queueService.deliver(blocker, content, blockee.inbox, false);
		}
	}
}
