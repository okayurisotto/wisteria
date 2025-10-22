/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { isUserRelated } from '@/misc/is-user-related.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { type MiChannelService, Channel } from '../channel.js';
import type { z } from 'zod';
import type { NoteSchema } from '@/models/zod/note.js';

class ChannelChannel extends Channel {
	public readonly chName = 'channel';
	public static override shouldShare = false;
	public static override requireCredential = false as const;
	private channelId: string | undefined;

	constructor(
		private readonly noteEntityService: NoteEntityService,

		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
		// this.onNote = this.onNote.bind(this);
	}

	public async init(params: unknown) {
		this.channelId = params.channelId as string;

		// Subscribe stream
		this.subscriber.on('notesStream', this.onNote);
	}

	private readonly onNote = async (note: z.infer<typeof NoteSchema>) => {
		if (note.channelId !== this.channelId) return;

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (isUserRelated(note, this.userIdsWhoMeMuting)) return;
		// 流れてきたNoteがブロックされているユーザーが関わるものだったら無視する
		if (isUserRelated(note, this.userIdsWhoBlockingMe)) return;

		if (note.renote && !note.text && isUserRelated(note, this.userIdsWhoMeMutingRenotes)) return;

		if (this.user && note.renoteId && !note.text) {
			if (note.renote && Object.keys(note.renote.reactions).length > 0) {
				const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
				note.renote.myReaction = myRenoteReaction;
			}
		}

		this.connection.cacheNote(note);

		this.send('note', note);
	};

	public override dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}

@Injectable()
export class ChannelChannelService implements MiChannelService<false> {
	public readonly shouldShare = ChannelChannel.shouldShare;
	public readonly requireCredential = ChannelChannel.requireCredential;
	public readonly kind = ChannelChannel.kind;

	constructor(
		private readonly noteEntityService: NoteEntityService,
	) {}

	public create(id: string, connection: Channel['connection']): ChannelChannel {
		return new ChannelChannel(
			this.noteEntityService,
			id,
			connection,
		);
	}
}
