/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { EmojisRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { EmojiDetailedSchema } from '@/models/zod/emoji.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 3600,

	res: EmojiDetailedSchema,
} as const;

export const paramDef = z.object({
	name: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		private readonly emojiEntityService: EmojiEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emoji = await this.emojisRepository.findOneOrFail({
				where: {
					name: ps.name,
					host: IsNull(),
				},
			});

			return this.emojiEntityService.packDetailed(emoji);
		});
	}
}
