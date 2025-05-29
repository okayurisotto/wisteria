/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { envOption } from '@/env.js';

/**
 * URLのプロトコルがHTTPSであるかどうかを確認します。
 * 開発環境でのみHTTPも許容し、HTTPSであるものとして`true`を返します。
 */
export const checkHttps = (urlText: string): boolean => {
	try {
		const url = new URL(urlText);

		if (url.protocol === 'https:') {
			return true;
		} else if (url.protocol === 'http:' && !envOption.isProduction) {
			return true;
		} else {
			return false;
		}
	} catch {
		return false;
	}
};
