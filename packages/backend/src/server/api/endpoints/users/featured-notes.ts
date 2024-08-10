/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { BlockingsRepository, MutingsRepository, NotesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { DI } from '@/di-symbols.js';
import { FeaturedService } from '@/core/FeaturedService.js';
import { isUserRelated } from '@/misc/is-user-related.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 3600,

	res: NoteSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(10),
	untilId: IdSchema.optional(),
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.mutingsRepository)
		private readonly mutingsRepository: MutingsRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly featuredService: FeaturedService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const userIdsWhoBlockingMe = me ? await this.blockingsRepository.find({ where: { blockeeId: me.id }, select: ['blockerId'] }).then(xs => new Set(xs.map(x => x.blockerId))) : new Set<string>();

			// early return if me is blocked by requesting user
			if (userIdsWhoBlockingMe.has(ps.userId)) {
				return [];
			}

			let noteIds = await this.featuredService.getPerUserNotesRanking(ps.userId, 50);

			noteIds.sort((a, b) => a > b ? -1 : 1);
			if (ps.untilId) {
				noteIds = noteIds.filter(id => id < ps.untilId!);
			}
			noteIds = noteIds.slice(0, ps.limit);

			if (noteIds.length === 0) {
				return [];
			}

			const [
				userIdsWhoMeMuting,
			] = me
				? await Promise.all([
					this.mutingsRepository.find({ where: { muterId: me.id }, select: ['muteeId'] }).then(xs => new Set(xs.map(x => x.muteeId))),
				])
				: [new Set<string>()];

			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.id IN (:...noteIds)', { noteIds: noteIds })
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser')
				.leftJoinAndSelect('note.channel', 'channel');

			const notes = (await query.getMany()).filter((note) => {
				if (me && isUserRelated(note, userIdsWhoBlockingMe, false)) return false;
				if (me && isUserRelated(note, userIdsWhoMeMuting, true)) return false;

				return true;
			});

			notes.sort((a, b) => a.id > b.id ? -1 : 1);

			return await this.noteEntityService.packMany(notes, me);
		});
	}
}
