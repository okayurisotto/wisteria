/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import Logger from '@/logger.js';
import { loadConfig } from '@/config.js';
import type { Config } from '@/config.js';
import { showMachineInfo } from '@/misc/show-machine-info.js';
import { envOption } from '@/env.js';
import { jobQueue, server } from './common.js';
import { META_FILE } from '@/path.js';

const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta');

export const initialize = async () => {
	let config!: Config;

	try {
		greet();
		showEnvironment();
		await showMachineInfo(bootLogger);
		showNodejsVersion();
		config = loadConfigBoot();
		if (config.pidFile) fs.writeFileSync(config.pidFile, process.pid.toString());
	} catch {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Wisteria initialized');

	if (envOption.MK_ONLY_SERVER) {
		await server();
	} else if (envOption.MK_ONLY_QUEUE) {
		await jobQueue();
	} else {
		await server();
		await jobQueue();
	}

	if (envOption.MK_ONLY_QUEUE) {
		bootLogger.succ('Queue started', null, true);
	} else {
		bootLogger.succ(
			config.socket
				? `Now listening on socket ${config.socket} on ${config.url}`
				: `Now listening on port ${config.port.toString()} on ${config.url}`,
			null,
			true,
		);
	}
};

const greet = (): void => {
	bootLogger.info('Welcome to Wisteria!');
	bootLogger.info(`Wisteria v${meta.version}`, null, true);
};

const showEnvironment = (): void => {
	const env = process.env['NODE_ENV'];
	const logger = bootLogger.createSubLogger('env');
	logger.info(typeof env === 'undefined' ? 'NODE_ENV is not set' : `NODE_ENV: ${env}`);

	if (env !== 'production') {
		logger.warn('The environment is not in production mode.');
		logger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', null, true);
	}
}

const showNodejsVersion = (): void => {
	const nodejsLogger = bootLogger.createSubLogger('nodejs');
	nodejsLogger.info(`Version ${process.version} detected.`);
}

const loadConfigBoot = (): Config => {
	const configLogger = bootLogger.createSubLogger('config');

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
}
