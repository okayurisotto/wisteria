/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// devモードで起動される際（index.htmlを使うとき）はrouterが暴発してしまってうまく読み込めない。
// よって、devモードとして起動されるときはビルド時に組み込む形としておく。
// (pnpm start時はpugファイルの中で静的リソースとして読み込むようになっており、この問題は起こっていない)
import '@tabler/icons-webfont/tabler-icons.scss';

await main();

import('@/_boot_.js');

/**
 * backend/src/server/web/boot.jsで差し込まれている起動処理のうち、最低限必要なものを模倣するための処理
 */
async function main() {
	const forceError = localStorage.getItem('forceError');
	if (forceError != null) {
		renderError('FORCED_ERROR', 'This error is forced by having forceError in local storage.');
	}

	const fontSize = localStorage.getItem('fontSize');
	if (fontSize) {
		document.documentElement.classList.add('f-' + fontSize);
	}

	const useSystemFont = localStorage.getItem('useSystemFont');
	if (useSystemFont) {
		document.documentElement.classList.add('useSystemFont');
	}

	const wallpaper = localStorage.getItem('wallpaper');
	if (wallpaper) {
		document.documentElement.style.backgroundImage = `url(${wallpaper})`;
	}
}

function renderError(code: string, details?: string) {
	console.log(code, details);
}
