/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import cssnano from 'cssnano';
import postcss from 'postcss';
import * as terser from 'terser';
import { loadConfig } from '../packages/backend/built/config.js';
import { languages } from '../packages/locales/built/index.js';
import { build as buildTarball } from './tarball.mjs';

const root = path.join(import.meta.dirname, '..');

async function copyBackendViews() {
	await fs.cp(
		path.join(root, './packages/backend/src/server/web/views'),
		path.join(root, './packages/backend/built/server/web/views'),
		{ recursive: true },
	);
}

async function copyBackendAssets() {
	await fs.cp(
		path.join(root, './packages/backend/src/server/assets'),
		path.join(root, './packages/backend/built/server/assets'),
		{ recursive: true },
	);
}

async function buildBackendScript() {
	await fs.mkdir(
		path.join(root, './packages/backend/built/server/web'),
		{ recursive: true },
	);

	for (const file of [
		path.join(root, './packages/backend/src/server/web/boot.js'),
		path.join(root, './packages/backend/src/server/web/bios.js'),
		path.join(root, './packages/backend/src/server/web/cli.js'),
	]) {
		let source = await fs.readFile(file, { encoding: 'utf-8' });
		source = source.replaceAll('LANGS', JSON.stringify(Object.keys(languages)));
		const { code } = await terser.minify(source, { toplevel: true });
		await fs.writeFile(
			path.join(root, './packages/backend/built/server/web/', path.basename(file)),
			code,
		);
	}
}

async function buildBackendStyle() {
	await fs.mkdir(
		path.join(root, './packages/backend/built/server/web'),
		{ recursive: true },
	);

	for (const file of [
		path.join(root, './packages/backend/src/server/web/style.css'),
		path.join(root, './packages/backend/src/server/web/bios.css'),
		path.join(root, './packages/backend/src/server/web/cli.css'),
		path.join(root, './packages/backend/src/server/web/error.css'),
	]) {
		const source = await fs.readFile(file, { encoding: 'utf-8' });
		const { css } = await postcss([cssnano({ zindex: false })]).process(source, { from: undefined });
		await fs.writeFile(
			path.join(root, './packages/backend/built/server/web/', path.basename(file)),
			css,
		);
	}
}

async function build() {
	await Promise.all([
		copyBackendViews(),
		copyBackendAssets(),
		buildBackendScript(),
		buildBackendStyle(),
		(async () => {
			try {
				const config = loadConfig();
				if (config?.publishTarballInsteadOfProvideRepositoryUrl) {
					await buildTarball();
				}
			} catch {
				// Dockerfileからのビルドなどでは設定ファイルが提供されていないためエラーになる
			}
		})(),
	]);
}

await build();
