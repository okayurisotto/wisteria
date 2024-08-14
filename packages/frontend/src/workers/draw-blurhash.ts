/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { render } from 'buraha';

const canvas = new OffscreenCanvas(64, 64);

onmessage = async (event) => {
	if (!('id' in event.data && typeof event.data.id === 'string')) {
		return;
	}
	if (!('hash' in event.data && typeof event.data.hash === 'string')) {
		return;
	}

	render(event.data.hash, canvas);
	const blob = await canvas.convertToBlob();
	postMessage({ id: event.data.id, blob });
};
