/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent } from 'vue';
import { popup } from '@/os.js';
import { defaultStore } from '@/store.js';

/**
 * 絵文字ピッカーを表示する。
 * 類似の機能として{@link ReactionPicker}が存在しているが、この機能とは動きが異なる。
 * 投稿フォームなどで絵文字を選択する時など、絵文字ピックアップ後でもダイアログが消えずに残り、
 * 一度表示したダイアログを連続で使用できることが望ましいシーンでの利用が想定される。
 */
export class EmojiPicker {
	constructor(
		private readonly src: HTMLElement | null,
		private readonly onChosen?: (emoji: string) => void,
		private readonly onClosed?: () => void,
	) {}

	private async init() {
		await popup(defineAsyncComponent(() => import('@/components/MkEmojiPickerDialog.vue')), {
			src: this.src,
			pinnedEmojis: defaultStore.reactiveState.pinnedEmojis.value,
			asReactionPicker: false,
			choseAndClose: false,
		}, {
			done: emoji => {
				if (this.onChosen) this.onChosen(emoji);
			},
			close: () => {
				if (this.onClosed) this.onClosed();
			},
		}, 'closed');
	}

	public static async show(
		src: HTMLElement | null,
		onChosen?: EmojiPicker['onChosen'],
		onClosed?: EmojiPicker['onClosed'],
	) {
		return await new EmojiPicker(src, onChosen, onClosed).init();
	}
}
