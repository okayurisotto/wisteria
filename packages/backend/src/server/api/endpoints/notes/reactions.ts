/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { NoteReactionsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteReactionEntityService } from '@/core/entities/NoteReactionEntityService.js';
import { DI } from '@/di-symbols.js';
import { QueryService } from '@/core/QueryService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteReactionSchema } from '@/models/zod/note-reaction.js';

export const meta = {
	tags: ['notes', 'reactions'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 60,

	res: NoteReactionSchema.array(),

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '263fff3d-d0e1-4af4-bea7-8408059b451a',
		},
	},
} as const;

export const paramDef = z.object({
	noteId: IdSchema,
	type: z.string().nullable().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		private readonly noteReactionEntityService: NoteReactionEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.noteReactionsRepository.createQueryBuilder('reaction'), ps.sinceId, ps.untilId)
				.andWhere('reaction.noteId = :noteId', { noteId: ps.noteId })
				.leftJoinAndSelect('reaction.user', 'user')
				.leftJoinAndSelect('reaction.note', 'note');

			if (ps.type) {
				// ローカルリアクションはホスト名が . とされているが
				// DB 上ではそうではないので、必要に応じて変換
				const suffix = '@.:';
				const type = ps.type.endsWith(suffix) ? ps.type.slice(0, ps.type.length - suffix.length) + ':' : ps.type;
				query.andWhere('reaction.reaction = :type', { type });
			}

			const reactions = await query.limit(ps.limit).getMany();

			return await Promise.all(reactions.map(reaction => this.noteReactionEntityService.pack(reaction, me)));
		});
	}
}
