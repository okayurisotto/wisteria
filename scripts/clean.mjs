// @ts-check

import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * @param {string} relpath
 * @returns {Promise<void>}
 */
const cleanup = async (relpath) => {
	const abspath = path.join(import.meta.dirname, '..', relpath);
	await fs.rm(abspath, { recursive: true, force: true });
};

await Promise.all([
	cleanup('built'),

	cleanup('packages/backend/built'),
	cleanup('packages/frontend/built'),
	cleanup('packages/hono-serve-static/built'),
	cleanup('packages/http-signature/built'),
	cleanup('packages/identicon-generator/built'),
	cleanup('packages/locales/built'),
	cleanup('packages/misskey-js/built'),
	cleanup('packages/parcom/built'),
	cleanup('packages/redis-lock/built'),
	cleanup('packages/sw/built'),
	cleanup('packages/vite-manifest/built'),
	cleanup('packages/zod2spec/built'),

	cleanup('.turbo'),

	cleanup('packages/backend/.turbo'),
	cleanup('packages/frontend/.turbo'),
	cleanup('packages/hono-serve-static/.turbo'),
	cleanup('packages/http-signature/.turbo'),
	cleanup('packages/identicon-generator/.turbo'),
	cleanup('packages/locales/.turbo'),
	cleanup('packages/misskey-js/.turbo'),
	cleanup('packages/parcom/.turbo'),
	cleanup('packages/redis-lock/.turbo'),
	cleanup('packages/sw/.turbo'),
	cleanup('packages/vite-manifest/.turbo'),
	cleanup('packages/zod2spec/.turbo'),
]);
