/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { join } from 'node:path';
import { rm } from 'node:fs/promises';

void Promise.all([
	rm(join(import.meta.dirname, '/../packages/backend/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/frontend/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/hono-serve-static/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/http-signature/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/identicon-generator/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/misskey-js/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/parcom/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../packages/sw/built'), { recursive: true, force: true }),
	rm(join(import.meta.dirname, '/../built'), { recursive: true, force: true }),
]);
