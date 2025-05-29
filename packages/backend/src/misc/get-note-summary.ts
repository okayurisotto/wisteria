/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { z } from 'zod';
import type { NoteSchema } from '@/models/zod/note.js';

/**
 * 投稿を表す文字列を取得します。
 * @param {*} note (packされた)投稿
 */
export const getNoteSummary = (note: z.infer<typeof NoteSchema>): string => {
	if (note.deletedAt != null) {
		return '(❌⛔)';
	}

	if (note.isHidden === true) {
		return '(⛔)';
	}

	let summary = '';

	// 本文
	if (note.cw != null) {
		summary += note.cw;
	} else {
		summary += note.text !== null ? note.text : '';
	}

	// ファイルが添付されているとき
	if (note.files !== undefined && note.files.length !== 0) {
		summary += ` (📎${note.files.length})`;
	}

	// 投票が添付されているとき
	if (note.poll) {
		summary += ' (📊)';
	}

	// 返信のとき
	if (note.replyId != null) {
		if (note.reply) {
			summary += `\n\nRE: ${getNoteSummary(note.reply)}`;
		} else {
			summary += '\n\nRE: ...';
		}
	}

	// Renoteのとき
	if (note.renoteId != null) {
		if (note.renote) {
			summary += `\n\nRN: ${getNoteSummary(note.renote)}`;
		} else {
			summary += '\n\nRN: ...';
		}
	}

	return summary.trim();
};
