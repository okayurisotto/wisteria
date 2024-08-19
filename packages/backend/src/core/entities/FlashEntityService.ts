/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { FlashsRepository, FlashLikesRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { MiFlash } from '@/models/Flash.js';
import { IdService } from '@/core/IdService.js';
import type { z } from 'zod';
import type { FlashSchema } from '@/models/zod/flash.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class FlashEntityService {
	constructor(
		@Inject(DI.flashsRepository)
		private readonly flashsRepository: FlashsRepository,

		@Inject(DI.flashLikesRepository)
		private readonly flashLikesRepository: FlashLikesRepository,

		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiFlash['id'] | MiFlash,
		me?: { id: MiUser['id'] } | null | undefined,
	): Promise<z.infer<typeof FlashSchema>> {
		const meId = me ? me.id : null;
		const flash = typeof src === 'object' ? src : await this.flashsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: flash.id,
			createdAt: this.idService.parse(flash.id).date.toISOString(),
			updatedAt: flash.updatedAt.toISOString(),
			userId: flash.userId,
			user: this.userLiteEntityService.packLite(flash.user ?? flash.userId),
			title: flash.title,
			summary: flash.summary,
			script: flash.script,
			likedCount: flash.likedCount,
			isLiked: meId ? await this.flashLikesRepository.exists({ where: { flashId: flash.id, userId: meId } }) : undefined,
		});
	}

	public packMany(
		flashs: MiFlash[],
		me?: { id: MiUser['id'] } | null | undefined,
	) {
		return Promise.all(flashs.map(x => this.pack(x, me)));
	}
}
