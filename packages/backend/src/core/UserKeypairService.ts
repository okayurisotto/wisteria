/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MiUser } from '@/models/User.js';
import type { UserKeypairsRepository } from '@/models/_.js';
import type { MiUserKeypair } from '@/models/UserKeypair.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class UserKeypairService {
	constructor(
		@Inject(DI.userKeypairsRepository)
		private userKeypairsRepository: UserKeypairsRepository,
	) {}

	@bindThis
	public async getUserKeypair(userId: MiUser['id']): Promise<MiUserKeypair> {
		return await this.userKeypairsRepository.findOneByOrFail({ userId });
	}
}
