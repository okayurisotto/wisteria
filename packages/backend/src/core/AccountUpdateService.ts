/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { RelayService } from '@/core/RelayService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

@Injectable()
export class AccountUpdateService {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
		private readonly apRendererService: ApRendererService,
		private readonly apDeliverManagerService: ApDeliverManagerService,
		private readonly relayService: RelayService,
	) {}

	public async publishToFollowers(userId: MiUser['id']) {
		const user = await this.usersRepository.findOneBy({ id: userId });
		if (user == null) throw new Error('user not found');

		// フォロワーがリモートユーザーかつ投稿者がローカルユーザーならUpdateを配信
		if (this.userEntityService.isLocalUser(user)) {
			const content = this.apRendererService.addContext(this.apRendererService.renderUpdate(await this.apRendererService.renderPerson(user), user));
			this.apDeliverManagerService.deliverToFollowers(user, content);
			this.relayService.deliverToRelays(user, content);
		}
	}
}
