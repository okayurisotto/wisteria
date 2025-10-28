/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const postMessageEventTypes = [
	'misskey:shareForm:shareCompleted',
] as const;

type PostMessageEventType = typeof postMessageEventTypes[number];

/**
 * 親フレームにイベントを送信
 */
export function postMessageToParentWindow(type: PostMessageEventType, payload?: any): void {
	window.postMessage({
		type,
		payload,
	}, '*');
}
