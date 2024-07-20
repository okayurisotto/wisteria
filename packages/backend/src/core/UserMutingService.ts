/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import type { MutingsRepository, MiMuting } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import type { MiUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class UserMutingService {
	constructor(
		@Inject(DI.mutingsRepository)
		private mutingsRepository: MutingsRepository,

		private idService: IdService,
	) {}

	@bindThis
	public async mute(user: MiUser, target: MiUser, expiresAt: Date | null = null): Promise<void> {
		await this.mutingsRepository.insert({
			id: this.idService.gen(),
			expiresAt: expiresAt ?? null,
			muterId: user.id,
			muteeId: target.id,
		});
	}

	@bindThis
	public async unmute(mutings: MiMuting[]): Promise<void> {
		if (mutings.length === 0) return;

		await this.mutingsRepository.delete({
			id: In(mutings.map(m => m.id)),
		});
	}
}
