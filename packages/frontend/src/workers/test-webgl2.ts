/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const canvas = globalThis.OffscreenCanvas && new OffscreenCanvas(1, 1);
// 環境によってはOffscreenCanvasが存在しないため
const gl = canvas?.getContext('webgl2');
if (gl) {
	postMessage({ result: true });
} else {
	postMessage({ result: false });
}
