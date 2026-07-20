/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';

void Promise.all([
	rm(resolve(import.meta.dirname, '../built'), { recursive: true, force: true }),

	rm(resolve(import.meta.dirname, '../packages/backend/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/frontend/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/hono-serve-static/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/http-signature/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/identicon-generator/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/locales/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/misskey-js/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/parcom/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/redis-lock/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/sw/built'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/zod2spec/built'), { recursive: true, force: true }),

	rm(resolve(import.meta.dirname, '../.turbo'), { recursive: true, force: true }),

	rm(resolve(import.meta.dirname, '../packages/backend/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/frontend/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/hono-serve-static/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/http-signature/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/identicon-generator/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/locales/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/misskey-js/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/parcom/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/redis-lock/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/sw/.turbo'), { recursive: true, force: true }),
	rm(resolve(import.meta.dirname, '../packages/zod2spec/.turbo'), { recursive: true, force: true }),
]);
