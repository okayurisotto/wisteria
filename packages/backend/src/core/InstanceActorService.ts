/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import type { MiLocalUser } from '@/models/User.js';
import type { UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { CreateSystemUserService } from '@/core/CreateSystemUserService.js';
import { bindThis } from '@/decorators.js';

const ACTOR_USERNAME = 'instance.actor' as const;

@Injectable()
export class InstanceActorService {
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private createSystemUserService: CreateSystemUserService,
	) {}

	@bindThis
	public async realLocalUsersPresent(): Promise<boolean> {
		return await this.usersRepository.existsBy({
			host: IsNull(),
			username: Not(ACTOR_USERNAME),
		});
	}

	@bindThis
	public async getInstanceActor(): Promise<MiLocalUser> {
		const user = await this.usersRepository.findOneBy({
			host: IsNull(),
			username: ACTOR_USERNAME,
		}) as MiLocalUser | undefined;

		if (user) {
			return user;
		} else {
			const created = await this.createSystemUserService.createSystemUser(ACTOR_USERNAME) as MiLocalUser;
			return created;
		}
	}
}
