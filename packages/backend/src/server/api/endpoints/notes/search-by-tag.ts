/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { safeForSql } from '@/misc/safe-for-sql.js';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { NoteSchema } from '@/models/zod/note.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['notes', 'hashtags'],

	res: NoteSchema.array(),
} as const;

export const paramDef = z.intersection(
	z.union([
		z.object({
			tag: z.string().min(1),
			query: z.never().optional(),
		}),
		z.object({
			tag: z.never().optional(),
			query: z.string().min(1).array().min(1).array().min(1).describe('The outer arrays are chained with OR, the inner arrays are chained with AND.'),
		}),
	]),
	z.object({
		reply: z.boolean().nullable().default(null),
		renote: z.boolean().nullable().default(null),
		withFiles: z.boolean().default(false).describe('Only show notes that have attached files.'),
		poll: z.boolean().nullable().default(null),
		sinceId: IdSchema.optional(),
		untilId: IdSchema.optional(),
		limit: z.number().int().min(1).max(100).default(10),
	}),
);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'), ps.sinceId, ps.untilId)
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');

			this.queryService.generateVisibilityQuery(query, me);
			if (me) this.queryService.generateMutedUserQuery(query, me);
			if (me) this.queryService.generateBlockedUserQuery(query, me);

			try {
				if (ps.tag) {
					if (!safeForSql(normalizeForSearch(ps.tag))) throw new Error('Injection');
					query.andWhere(':tag <@ note.tags', { tag: [normalizeForSearch(ps.tag)] });
				} else {
					query.andWhere(new Brackets((qb) => {
						for (const tags of ps.query!) {
							qb.orWhere(new Brackets((qb) => {
								for (const tag of tags) {
									if (!safeForSql(normalizeForSearch(tag))) throw new Error('Injection');
									qb.andWhere(':tag <@ note.tags', { tag: [normalizeForSearch(tag)] });
								}
							}));
						}
					}));
				}
			} catch (e) {
				if (e === 'Injection') return [];
				throw e;
			}

			if (ps.reply != null) {
				if (ps.reply) {
					query.andWhere('note.replyId IS NOT NULL');
				} else {
					query.andWhere('note.replyId IS NULL');
				}
			}

			if (ps.renote != null) {
				if (ps.renote) {
					query.andWhere('note.renoteId IS NOT NULL');
				} else {
					query.andWhere('note.renoteId IS NULL');
				}
			}

			if (ps.withFiles) {
				query.andWhere('note.fileIds != \'{}\'');
			}

			if (ps.poll != null) {
				if (ps.poll) {
					query.andWhere('note.hasPoll = TRUE');
				} else {
					query.andWhere('note.hasPoll = FALSE');
				}
			}

			// Search notes
			const notes = await query.limit(ps.limit).getMany();

			return await this.noteEntityService.packMany(notes, me);
		});
	}
}
