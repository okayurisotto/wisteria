/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { FollowRequestsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiFollowRequest } from '@/models/FollowRequest.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class FollowRequestEntityService {
	constructor(
		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiFollowRequest['id'] | MiFollowRequest,
		me?: { id: MiUser['id'] } | null | undefined,
	) {
		const request = typeof src === 'object' ? src : await this.followRequestsRepository.findOneByOrFail({ id: src });

		return {
			id: request.id,
			follower: await this.userLiteEntityService.packLite(request.followerId),
			followee: await this.userLiteEntityService.packLite(request.followeeId),
		};
	}
}
