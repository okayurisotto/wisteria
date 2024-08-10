/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { RenoteMutingsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { MiRenoteMuting } from '@/models/RenoteMuting.js';
import { IdService } from '@/core/IdService.js';
import { UserEntityService } from './UserEntityService.js';
import type { z } from 'zod';
import type { RenoteMutingSchema } from '@/models/zod/renote-muting.js';

@Injectable()
export class RenoteMutingEntityService {
	constructor(
		@Inject(DI.renoteMutingsRepository)
		private readonly renoteMutingsRepository: RenoteMutingsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly idService: IdService,
	) {}

	public async pack(
		src: MiRenoteMuting['id'] | MiRenoteMuting,
		me?: { id: MiUser['id'] } | null | undefined,
	): Promise<z.infer<typeof RenoteMutingSchema>> {
		const muting = typeof src === 'object' ? src : await this.renoteMutingsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: muting.id,
			createdAt: this.idService.parse(muting.id).date.toISOString(),
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
