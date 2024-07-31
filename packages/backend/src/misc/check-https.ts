/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { envOption } from "@/env.js";

export function checkHttps(url: string): boolean {
	return url.startsWith('https://') ||
		(url.startsWith('http://') && !envOption.isProduction);
}
