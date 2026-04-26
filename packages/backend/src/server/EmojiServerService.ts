/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { TWEMOJI_DIR } from '@/path.js';
import path from 'node:path';
import { Hono, type MiddlewareHandler } from 'hono';
import { serveStaticDir } from 'hono-serve-static';

@Injectable()
export class EmojiServerService {
	public createServer(): Hono {
		const hono = new Hono();

		const setEmojiHeaders: MiddlewareHandler = async (c, next) => {
			c.header('Content-Security-Policy', 'default-src \'none\'; style-src \'unsafe-inline\'');
			c.header('Cache-Control', `max-age=${30 * 24 * 60 * 60}`);
			await next();
		};

		hono.get(
			'/twemoji/:path',
			setEmojiHeaders,
			serveStaticDir({
				path: TWEMOJI_DIR,
				mountpoint: '/twemoji/',
				index: null,
			}),
		);

		hono.get(
			'/twemoji-badge/:path',
			setEmojiHeaders,
			async (c) => {
				const filepath = c.req.param('path');
				if (!filepath.match(/^[0-9a-f-]+\.png$/)) return c.notFound();

				const mask = await sharp(
					path.join(TWEMOJI_DIR, filepath.replace(/\.png$/, '.svg')),
					{ density: 1000 },
				)
					.resize(488, 488)
					.greyscale()
					.normalise()
					.linear(1.75, -(128 * 1.75) + 128) // 1.75x contrast
					.flatten({ background: '#000' })
					.extend({
						top: 12,
						bottom: 12,
						left: 12,
						right: 12,
						background: '#000',
					})
					.toColorspace('b-w')
					.png()
					.toBuffer();

				const buffer = await sharp({
					create: {
						width: 512,
						height: 512,
						channels: 4,
						background: { r: 0, g: 0, b: 0, alpha: 0 },
					},
				})
					.pipelineColorspace('b-w')
					.boolean(mask, 'eor')
					.resize(96, 96)
					.png()
					.toBuffer();

				c.header('Content-Type', 'image/png');
				return c.body(buffer);
			},
		);

		return hono;
	}
}
