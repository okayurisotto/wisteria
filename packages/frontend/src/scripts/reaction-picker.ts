/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent } from 'vue';
import type * as Misskey from 'misskey-js';
import { popup } from '@/os.js';
import { defaultStore } from '@/store.js';

export class ReactionPicker {
	constructor(
		private readonly src: HTMLElement | null,
		private readonly targetNote: Misskey.entities.Note | null,
		private readonly onChosen?: (reaction: string) => void,
		private readonly onClosed?: () => void,
	) {}

	private async init() {
		await popup(defineAsyncComponent(() => import('@/components/MkEmojiPickerDialog.vue')), {
			src: this.src,
			pinnedEmojis: defaultStore.reactiveState.reactions.value,
			asReactionPicker: true,
			...(this.targetNote !== null ? { targetNote: this.targetNote } : {}),
		}, {
			done: reaction => {
				if (this.onChosen) this.onChosen(reaction);
			},
			closed: () => {
				if (this.onClosed) this.onClosed();
			},
		}, 'closed');
	}

	public static async show(
		src: HTMLElement | null,
		targetNote: Misskey.entities.Note | null,
		onChosen?: ReactionPicker['onChosen'],
		onClosed?: ReactionPicker['onClosed'],
	) {
		return await new ReactionPicker(src, targetNote, onChosen, onClosed).init();
	}
}
