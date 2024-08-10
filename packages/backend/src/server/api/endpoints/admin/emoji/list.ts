/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { EmojisRepository } from '@/models/_.js';
import type { MiEmoji } from '@/models/Emoji.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
// import { sqlLikeEscape } from '@/misc/sql-like-escape.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'read:admin:emoji',

	res: z.object({
		id: IdSchema.optional(),
		aliases: z.string().array().optional(),
		name: z.string().optional(),
		category: z.string().nullable().optional(),
		host: z.string().nullable().describe('The local host is represented with `null`. The field exists for compatibility with other API endpoints that return files.').optional(),
		url: z.string().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	query: z.string().nullable().default(null),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		private readonly emojiEntityService: EmojiEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const q = this.queryService.makePaginationQuery(this.emojisRepository.createQueryBuilder('emoji'), ps.sinceId, ps.untilId)
				.andWhere('emoji.host IS NULL');

			let emojis: MiEmoji[];

			if (ps.query) {
				// q.andWhere('emoji.name ILIKE :q', { q: `%${ sqlLikeEscape(ps.query) }%` });
				// const emojis = await q.limit(ps.limit).getMany();

				emojis = await q.getMany();
				const queryarry = ps.query.match(/:([a-z0-9_]*):/g);

				if (queryarry) {
					emojis = emojis.filter(emoji =>
						queryarry.includes(`:${emoji.name}:`),
					);
				} else {
					emojis = emojis.filter(emoji =>
						emoji.name.includes(ps.query!) ||
						emoji.aliases.some(a => a.includes(ps.query!)) ||
						emoji.category?.includes(ps.query!));
				}
				emojis.splice(ps.limit + 1);
			} else {
				emojis = await q.limit(ps.limit).getMany();
			}

			return this.emojiEntityService.packDetailedMany(emojis);
		});
	}
}
