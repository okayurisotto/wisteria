/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function getUrlWithoutLoginId(url: string) {
	const u = new URL(url);
	u.searchParams.delete('loginId');
	return u.toString();
}
