/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MiUser } from '@/models/User.js';
import { bindThis } from '@/decorators.js';
import { DI } from '@/di-symbols.js';
import type { BlockingsRepository } from '@/models/_.js';

@Injectable()
export class UserBlockingCheckService {
	constructor(
		@Inject(DI.blockingsRepository)
		private blockingsRepository: BlockingsRepository,
	) {}

	@bindThis
	public async checkBlocked(
		blockerId: MiUser['id'],
		blockeeId: MiUser['id'],
	): Promise<boolean> {
		return await this.blockingsRepository.existsBy({ blockerId, blockeeId });
	}
}
