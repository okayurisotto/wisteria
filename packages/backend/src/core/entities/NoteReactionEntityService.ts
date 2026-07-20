/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NoteReactionsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import type { MiUser } from '@/models/User.js';
import type { MiNoteReaction } from '@/models/NoteReaction.js';
import { NoteEntityService } from './NoteEntityService.js';
import { LegacyReactionConvertService } from '@/core/LegacyReactionConvertService.js';
import type { z } from 'zod';
import type { NoteReactionSchema } from '@/models/zod/note-reaction.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class NoteReactionEntityService {
	constructor(
		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		private readonly legacyReactionConvertService: LegacyReactionConvertService,
		private readonly idService: IdService,
		private readonly noteEntityService: NoteEntityService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiNoteReaction['id'] | MiNoteReaction,
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			withNote: boolean;
		},
	): Promise<z.infer<typeof NoteReactionSchema>> {
		const opts = Object.assign({
			withNote: false,
		}, options);

		const reaction = typeof src === 'object' ? src : await this.noteReactionsRepository.findOneByOrFail({ id: src });

		return {
			id: reaction.id,
			createdAt: this.idService.parse(reaction.id).date.toISOString(),
			user: await this.userLiteEntityService.packLite(reaction.user ?? reaction.userId),
			type: this.legacyReactionConvertService.convertLegacyReaction(reaction.reaction),
			...(opts.withNote
				? {
						note: await this.noteEntityService.pack(reaction.note ?? reaction.noteId, me),
					}
				: {}),
		};
	}
}
