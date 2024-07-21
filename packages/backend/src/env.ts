/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const envOption = {
	isTest: process.env['NODE_ENV'] === 'test',
	isDevelopment: process.env['NODE_ENV'] === 'development',
	isProduction: process.env['NODE_ENV'] === 'production',

	PORT: process.env['PORT'] ? parseInt(process.env['PORT'], 10) : null,
	VITE_PORT: process.env['VITE_PORT'] ?? '5173',

	MISSKEY_CONFIG_YML: process.env['MISSKEY_CONFIG_YML'] ?? null,
	MISSKEY_TEST_CHECK_IP_RANGE:
		process.env['MISSKEY_TEST_CHECK_IP_RANGE'] === '1',
	MISSKEY_WEBFINGER_USE_HTTP:
		process.env['MISSKEY_WEBFINGER_USE_HTTP']?.toLowerCase() === 'true',

	MK_ONLY_QUEUE: process.env['MK_ONLY_QUEUE'] !== undefined,
	MK_ONLY_SERVER: process.env['MK_ONLY_SERVER'] !== undefined,
	MK_QUIET: process.env['MK_QUIET'] !== undefined,
	MK_VERBOSE: process.env['MK_VERBOSE'] !== undefined,
	MK_WITH_LOG_TIME: process.env['MK_WITH_LOG_TIME'] !== undefined,

	FORCE_FOLLOW_REMOTE_USER_FOR_TESTING:
		process.env['FORCE_FOLLOW_REMOTE_USER_FOR_TESTING'] === 'true',
};

if (envOption.isTest) {
	envOption.MK_QUIET = true;
}

export { envOption };
