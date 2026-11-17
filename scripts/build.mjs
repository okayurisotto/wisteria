// @ts-check

import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'tinyglobby';
import * as tar from 'tar';
import meta from '../package.json' with { type: 'json' };
import { run } from './run.mjs';

/**
 * @param {{
 *   rootDir: string;
 * }} options
 * @returns {Promise<void>}
 */
const buildApp = async (options) => {
	const result = await run('pnpm', ['turbo', 'build'], {
		cwd: options.rootDir,
		stdio: ["ignore", "inherit", "inherit"],
	});

	if (result.code !== 0) {
		throw new Error(`\`pnpm turbo build\` exited with code: ${result.code}, signal: ${result.signal}`);
	}
};

/**
 * @param {{
 *   config: import('../packages/backend/built/config.js').Config;
 *   rootDir: string;
 *   tarFile: string;
 * }} options
 * @returns {Promise<void>}
 */
const buildTarball = async (options) => {
	if (options.config.publishTarballInsteadOfProvideRepositoryUrl) {
		await fs.mkdir(path.dirname(options.tarFile), { recursive: true });

		await tar.create(
			{
				cwd: options.rootDir,
				file: options.tarFile,
				gzip: true,
			},
			await glob(
				'**/*',
				{
					cwd: options.rootDir,
					ignore: [
						'.dockerignore',
						'Dockerfile',
						'compose.yaml',
						'compose.*.yaml',

						'.git/',
						'.gitattributes',
						'.github/',
						'.gitignore',

						'.vscode/',

						'**/.turbo/',
						'**/built/',
						'**/node_modules/',

						'.config/',
						'db/',
						'files/',
						'redis/',
					],
					dot: true,
				},
			),
		);
	}
};

/**
 * @returns {Promise<void>}
 */
const main = async () => {
	const rootDir = path.join(import.meta.dirname, '..');
	const configModule = path.join(rootDir, 'packages/backend/built/config.js');
	const tarFile = path.join(rootDir, `built/tarball/misskey-${meta.version}.tar.gz`);

	await buildApp({ rootDir });

	const { loadConfig } = await import(configModule);

	let config = null;
	try {
		config = loadConfig();
	} catch {
		// No configuration is provided in contexts such as a Docker build context.
	}

	if (config !== null) {
		await buildTarball({ config, rootDir, tarFile });
	}
};

await main();
