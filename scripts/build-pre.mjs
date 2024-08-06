/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { resolve } from 'node:path';
import { readFile, mkdir, writeFile, watch } from 'node:fs/promises';

const packageJsonPath = resolve(import.meta.dirname, '../package.json');

const build = async () => {
	try {
		const json = await readFile(packageJsonPath, 'utf-8');
		const meta = JSON.parse(json);
		await mkdir(resolve(import.meta.dirname, '../built'), { recursive: true });
		await writeFile(
			resolve(import.meta.dirname, '../built/meta.json'),
			JSON.stringify({ version: meta.version }),
			'utf-8',
		);
	} catch (e) {
		console.error(e);
	}
};

void build();

void (async () => {
	if (process.argv.includes('--watch')) {
		for await (const { filename } of watch(packageJsonPath)) {
			console.log(`update ${filename} ...`);
			void build();
		}
	}
})();
