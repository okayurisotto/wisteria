/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Misskey Entry Point!
 */

import { EventEmitter } from 'node:events';
import Xev from 'xev';
import Logger from '@/logger.js';
import { envOption } from '@/env.js';
import { initialize } from './master.js';

import 'reflect-metadata';

process.title = 'Wisteria';

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 128;

const logger = new Logger('core', 'cyan');
const ev = new Xev();

// Display detail of unhandled promise rejection
if (!envOption.MK_QUIET) {
	process.on('unhandledRejection', console.dir);
}

// Display detail of uncaught exception
process.on('uncaughtException', (err) => {
	try {
		logger.error(err);
		console.trace(err);
	} catch { /* empty */ }
});

// Dying away...
process.on('exit', (code) => {
	logger.info(`The process is going to exit with code ${code.toString()}`);
});

await initialize();
ev.mount();

// ユニットテスト時にMisskeyが子プロセスで起動された時のため
// それ以外のときは process.send は使えないので弾く
if (process.send) {
	process.send('ok');
}
