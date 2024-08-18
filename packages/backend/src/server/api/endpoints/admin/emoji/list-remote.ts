/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { EmojisRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { DI } from '@/di-symbols.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

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
		host: z.string().nullable().describe('The local host is represented with `null`.').optional(),
		url: z.string().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	query: z.string().nullable().default(null),
	host: z.string().nullable().default(null).describe('Use `null` to represent the local host.'),
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		private readonly utilityService: UtilityService,
		private readonly queryService: QueryService,
		private readonly emojiEntityService: EmojiEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const q = this.queryService.makePaginationQuery(this.emojisRepository.createQueryBuilder('emoji'), ps.sinceId, ps.untilId);

			if (ps.host == null) {
				q.andWhere('emoji.host IS NOT NULL');
			} else {
				q.andWhere('emoji.host = :host', { host: this.utilityService.toPuny(ps.host) });
			}

			if (ps.query) {
				q.andWhere('emoji.name like :query', { query: '%' + sqlLikeEscape(ps.query) + '%' });
			}

			const emojis = await q
				.orderBy('emoji.id', 'DESC')
				.limit(ps.limit)
				.getMany();

			return this.emojiEntityService.packDetailedMany(emojis);
		});
	}
}
