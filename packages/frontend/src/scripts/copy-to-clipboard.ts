/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const copyToClipboard = (val: string | undefined | null) => {
	void navigator.clipboard.writeText(val ?? "");
};
