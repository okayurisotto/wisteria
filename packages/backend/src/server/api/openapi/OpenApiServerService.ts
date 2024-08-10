/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { generateFullOpenApiSpec } from './gen-spec.js';
import { STATIC_ASSETS_DIR } from '@/path.js';
import path from 'node:path';
import { Hono } from 'hono';
import { serveStaticFile } from 'hono-serve-static';

@Injectable()
export class OpenApiServerService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {}

	public createServer(): Hono {
		const hono = new Hono();

		hono.get(
			'/api-doc',
			async (c, next) => {
				c.header('Cache-Control', 'public, max-age=86400');
				await next();
			},
			serveStaticFile({ path: path.join(STATIC_ASSETS_DIR, 'redoc.html') }),
		);

		hono.get('/api.json', (c) => {
			c.header('Cache-Control', 'public, max-age=600');
			return c.json(generateFullOpenApiSpec(this.config));
		});

		return hono;
	}
}
