/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { ClipFavoritesRepository, ClipsRepository, MiUser } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiClip } from '@/models/Clip.js';
import { IdService } from '@/core/IdService.js';
import type { z } from 'zod';
import type { ClipSchema } from '@/models/zod/clip.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class ClipEntityService {
	constructor(
		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		@Inject(DI.clipFavoritesRepository)
		private readonly clipFavoritesRepository: ClipFavoritesRepository,

		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiClip['id'] | MiClip,
		me?: { id: MiUser['id'] } | null | undefined,
	): Promise<z.infer<typeof ClipSchema>> {
		const meId = me ? me.id : null;
		const clip = typeof src === 'object' ? src : await this.clipsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: clip.id,
			createdAt: this.idService.parse(clip.id).date.toISOString(),
			lastClippedAt: clip.lastClippedAt ? clip.lastClippedAt.toISOString() : null,
			userId: clip.userId,
			user: this.userLiteEntityService.packLite(clip.user ?? clip.userId),
			name: clip.name,
			description: clip.description,
			isPublic: clip.isPublic,
			favoritedCount: await this.clipFavoritesRepository.countBy({ clipId: clip.id }),
			isFavorited: meId ? await this.clipFavoritesRepository.exists({ where: { clipId: clip.id, userId: meId } }) : undefined,
		});
	}

	public packMany(
		clips: MiClip[],
		me?: { id: MiUser['id'] } | null | undefined,
	) {
		return Promise.all(clips.map(x => this.pack(x, me)));
	}
}
