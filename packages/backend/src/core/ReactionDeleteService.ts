/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type {
	NoteReactionsRepository,
	UsersRepository,
	NotesRepository,
	MiNoteReaction,
} from '@/models/_.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import type { MiUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { bindThis } from '@/decorators.js';
import { trackPromise } from '@/misc/promise-tracker.js';
import { ReactionDecodeService } from './ReactionDecodeService.js';

@Injectable()
export class ReactionDeleteService {
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.noteReactionsRepository)
		private noteReactionsRepository: NoteReactionsRepository,

		private userEntityService: UserEntityService,
		private globalEventService: GlobalEventService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private reactionDecodeService: ReactionDecodeService,
	) {}

	@bindThis
	public async delete(
		user: { id: MiUser['id']; host: MiUser['host']; isBot: MiUser['isBot'] },
		note: MiNote,
	) {
		// if already unreacted
		const exist = await this.noteReactionsRepository.findOneBy({
			noteId: note.id,
			userId: user.id,
		});

		if (exist === null) {
			throw new IdentifiableError(
				'60527ec9-b4cb-4a88-a6bd-32d3ad26817d',
				'not reacted',
			);
		}

		// Delete reaction
		const result = await this.noteReactionsRepository.delete(exist.id);

		if (result.affected !== 1) {
			throw new IdentifiableError(
				'60527ec9-b4cb-4a88-a6bd-32d3ad26817d',
				'not reacted',
			);
		}

		// Decrement reactions count
		const sql = `jsonb_set("reactions", '{${exist.reaction}}', (COALESCE("reactions"->>'${exist.reaction}', '0')::int - 1)::text::jsonb)`;
		await this.notesRepository
			.createQueryBuilder()
			.update()
			.set({
				reactions: () => sql,
				reactionAndUserPairCache: () =>
					`array_remove("reactionAndUserPairCache", '${user.id}/${exist.reaction}')`,
			})
			.where('id = :id', { id: note.id })
			.execute();

		this.globalEventService.publishNoteStream(note.id, 'unreacted', {
			reaction: this.reactionDecodeService.decodeReaction(exist.reaction)
				.reaction,
			userId: user.id,
		});

		if (this.userEntityService.isLocalUser(user) && !note.localOnly) {
			await this.deliver(user, note, exist);
		}
	}

	private async deliver(
		user: { id: MiUser['id']; host: null; isBot: MiUser['isBot'] },
		note: MiNote,
		exist: MiNoteReaction,
	): Promise<void> {
		const content = this.apRendererService.addContext(
			this.apRendererService.renderUndo(
				await this.apRendererService.renderLike(exist, note),
				user,
			),
		);

		const dm = this.apDeliverManagerService.createDeliverManager(user, content);

		const reactee = await this.usersRepository.findOneByOrFail({
			id: note.userId,
		});
		if (this.userEntityService.isRemoteUser(reactee)) {
			dm.addDirectRecipe(reactee);
		}

		dm.addFollowersRecipe();
		trackPromise(dm.execute());
	}
}
