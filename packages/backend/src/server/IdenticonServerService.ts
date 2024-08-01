/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { generate } from 'identicon-generator';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { MetaService } from '@/core/MetaService.js';
import { Hono } from 'hono';

@Injectable()
export class IdenticonServerService {
	private readonly fallbackUrl;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly metaService: MetaService,
	) {
		this.fallbackUrl = new URL(
			'/static-assets/avatar.png',
			this.config.url,
		).href;
	}

	public createServer(): Hono {
		return new Hono().get('/:seed', async (c) => {
			c.header('Content-Type', 'image/png');
			c.header('Cache-Control', 'public, max-age=86400');

			const meta = await this.metaService.fetch();
			if (meta.enableIdenticonGeneration) {
				const buffer = await generate(c.req.param('seed'), {
					pixels: 5,
					cellSize: 12,
					margin: 30,
				});
				return c.body(buffer);
			} else {
				return c.redirect(this.fallbackUrl);
			}
		});
	}
}
