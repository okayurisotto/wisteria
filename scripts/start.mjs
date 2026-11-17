// @ts-check

import path from 'node:path';
import { run } from './run.mjs';

const main = async () => {
	const rootDir = path.join(import.meta.dirname, '..');
	const entryFile = path.join(rootDir, 'packages/backend/built/boot/entry.js');

	if (process.argv.slice(2).includes("--migration")) {
		const migrateResult = await run('pnpm', ['migrate'], {
			cwd: rootDir,
			stdio: ['ignore', 'inherit', 'inherit'],
		});

		if (migrateResult.code !== 0) {
			throw new Error(`\`pnpm migrate\` exited with code ${migrateResult.code}, signal ${migrateResult.signal}`);
		}
	}

	if (process.execve !== undefined) {
		process.execve(process.execPath, [process.execPath, entryFile], process.env);
	} else {
		const startResult = await run(process.execPath, [entryFile], {
			cwd: rootDir,
			stdio: ['ignore', 'inherit', 'inherit'],
			env: process.env,
		});

		if (startResult.code !== 0) {
			throw new Error(`Wisteria exited with code ${startResult.code}, signal ${startResult.signal}`);
		}
	}
};

await main();
