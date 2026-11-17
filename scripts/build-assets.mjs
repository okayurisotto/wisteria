/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { loadConfig } from '../packages/backend/built/config.js';
import { build as buildTarball } from './tarball.mjs';

async function build() {
	try {
		const config = loadConfig();
		if (config?.publishTarballInsteadOfProvideRepositoryUrl) {
			await buildTarball();
		}
	} catch {
		// Dockerfileからのビルドなどでは設定ファイルが提供されていないためエラーになる
	}
}

await build();
