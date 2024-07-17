/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const envOption = {
	MK_DISABLE_CLUSTERING: process.env['MK_DISABLE_CLUSTERING'] !== undefined,
	MK_ONLY_QUEUE: process.env['MK_ONLY_QUEUE'] !== undefined,
	MK_ONLY_SERVER: process.env['MK_ONLY_SERVER'] !== undefined,
	MK_QUIET: process.env['MK_QUIET'] !== undefined,
	MK_VERBOSE: process.env['MK_VERBOSE'] !== undefined,
	MK_WITH_LOG_TIME: process.env['MK_WITH_LOG_TIME'] !== undefined,
};

if (process.env['NODE_ENV'] === 'test') {
	envOption.MK_DISABLE_CLUSTERING = true;
	envOption.MK_QUIET = true;
}

export { envOption };
