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
import { EmojiSimpleSchema } from '@/models/zod/emoji.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 3600,

	res: z.object({
		emojis: EmojiSimpleSchema.array().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		private readonly emojiEntityService: EmojiEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emojis = await this.emojisRepository.find({
				where: {
					host: IsNull(),
				},
				order: {
					category: 'ASC',
					name: 'ASC',
				},
			});

			return {
				emojis: await this.emojiEntityService.packSimpleMany(emojis),
			};
		});
	}
}
