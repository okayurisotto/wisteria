/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import type { MiUser } from '@/models/User.js';
import { bindThis } from '@/decorators.js';
import { CacheService } from '@/core/CacheService.js';

@Injectable()
export class UserBlockingCheckService {
	constructor(private readonly cacheService: CacheService) {}

	@bindThis
	public async checkBlocked(
		blockerId: MiUser['id'],
		blockeeId: MiUser['id'],
	): Promise<boolean> {
		const blockeeIds =
			await this.cacheService.userBlockingCache.fetch(blockerId);
		return blockeeIds.has(blockeeId);
	}
}
