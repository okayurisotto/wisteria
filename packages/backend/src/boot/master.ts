/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import sysUtils from 'systeminformation';
import Logger from '@/logger.js';
import { loadConfig } from '@/config.js';
import { envOption } from '@/env.js';
import { META_FILE } from '@/path.js';
import { server, jobQueue } from './common.js';

export const initialize = async () => {
	const meta = JSON.parse(await fs.readFile(META_FILE, 'utf-8'));

	const coreLogger = new Logger('core', 'cyan');
	const bootLogger = coreLogger.createSubLogger('boot', 'magenta');

	//#region Boot Message
	{
		bootLogger.info('Welcome to Wisteria!');
		bootLogger.info(`Wisteria v${meta.version}`, null, true);
	}
	//#endregion

	//#region NODE_ENV Log
	{
		const envLogger = bootLogger.createSubLogger('env');

		const NODE_ENV = process.env['NODE_ENV'];

		if (NODE_ENV === undefined) {
			envLogger.info('NODE_ENV is not set');
		} else {
			envLogger.info(`NODE_ENV: ${NODE_ENV}`);
		}

		if (!envOption.isProduction) {
			envLogger.warn('The environment is not in production mode.');
			envLogger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', null, true);
		}
	}
	//#endregion

	//#region Machine Information Log
	{
		const machineLogger = bootLogger.createSubLogger('machine');

		machineLogger.debug(`Hostname: ${os.hostname()}`);
		machineLogger.debug(`Platform: ${process.platform} Arch: ${process.arch}`);

		const mem = await sysUtils.mem();
		const totalmem = (mem.total / 1024 / 1024 / 1024).toFixed(1);
		const availmem = (mem.available / 1024 / 1024 / 1024).toFixed(1);

		machineLogger.debug(
			[
				`CPU: ${os.cpus().length.toString(10)} core`,
				`MEM: ${totalmem}GB (available: ${availmem}GB)`,
			].join(' '),
		);
	}
	//#endregion

	//#region Node.js Version Log
	{
		const nodejsLogger = bootLogger.createSubLogger('nodejs');
		nodejsLogger.info(`Version ${process.version} detected.`);
	}
	//#endregion

	//#region PID File Creation
	{
		const configLogger = bootLogger.createSubLogger('config');

		const config = (() => {
			try {
				const config = loadConfig();
				configLogger.succ('Loaded');
				return config;
			} catch (e) {
				if (typeof e === 'string') {
					configLogger.error(e);
					process.exit(1);
				} else if (e.code === 'ENOENT') {
					configLogger.error('Configuration file not found', null, true);
					process.exit(1);
				}

				throw e;
			}
		})();

		if (config.pidFile) {
			await fs.writeFile(config.pidFile, process.pid.toString());
		}
	}
	//#endregion

	bootLogger.succ('Wisteria initialized');

	if (envOption.MK_ONLY_SERVER) {
		await server();
	} else if (envOption.MK_ONLY_QUEUE) {
		await jobQueue();
	} else {
		await Promise.all([server(), jobQueue()]);
	}
};
