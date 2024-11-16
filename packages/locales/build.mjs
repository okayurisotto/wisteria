/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs/promises';
import { build as buildLocales } from './index.js';
import generateDTS from './generateDTS.js';
import meta from '../../package.json' with { type: 'json' };
import path from 'node:path';

let locales = buildLocales();

async function build() {
	generateDTS();

	await fs.mkdir('./built', { recursive: true });

	const v = { _version_: meta.version };

	await Promise.all(
		Object.entries(locales).map(async ([lang, locale]) => {
			await fs.writeFile(
				`./built/${lang}.${meta.version}.json`,
				JSON.stringify({ ...locale, ...v }),
				'utf-8',
			);
		}),
	);
}

await build();

if (process.argv.includes('--watch')) {
	const watcher = fs.watch('./');
	for await (const event of watcher) {
		if (event.filename === null) continue;

		const basename = path.basename(event.filename);
		if (/^[a-z]+-[A-Z]+\.yml/.test(basename)) {
			console.log(`update ${basename} ...`);
			locales = buildLocales();
			await build();
		}
	}
}
