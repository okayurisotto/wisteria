/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { MutingsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { } from '@/models/Blocking.js';
import type { MiUser } from '@/models/User.js';
import type { MiMuting } from '@/models/Muting.js';
import { IdService } from '@/core/IdService.js';
import { UserEntityService } from './UserEntityService.js';
import type { z } from 'zod';
import type { MutingSchema } from '@/models/zod/muting.js';

@Injectable()
export class MutingEntityService {
	constructor(
		@Inject(DI.mutingsRepository)
		private readonly mutingsRepository: MutingsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly idService: IdService,
	) {}

	public async pack(
		src: MiMuting['id'] | MiMuting,
		me?: { id: MiUser['id'] } | null | undefined,
	): Promise<z.infer<typeof MutingSchema>> {
		const muting = typeof src === 'object' ? src : await this.mutingsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: muting.id,
			createdAt: this.idService.parse(muting.id).date.toISOString(),
			expiresAt: muting.expiresAt ? muting.expiresAt.toISOString() : null,
			muteeId: muting.muteeId,
			mutee: this.userEntityService.pack(muting.muteeId, me, {
				schema: 'UserDetailedNotMe',
			}),
		});
	}

	public packMany(
		mutings: any[],
		me: { id: MiUser['id'] },
	) {
		return Promise.all(mutings.map(x => this.pack(x, me)));
	}
}
