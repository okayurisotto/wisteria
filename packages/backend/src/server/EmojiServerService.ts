/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import sharp from 'sharp';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FLUENT_EMOJI_DIR, TWEMOJI_DIR } from '@/path.js';

@Injectable()
export class EmojiServerService {
	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.get<{ Params: { path: string } }>(
			'/fluent-emoji/:path(.*)',
			async (request, reply) => {
				const path = request.params.path;

				if (!path.match(/^[0-9a-f-]+\.png$/)) {
					reply.code(404);
					return;
				}

				reply.header(
					'Content-Security-Policy',
					"default-src 'none'; style-src 'unsafe-inline'",
				);

				return await reply.sendFile(path, FLUENT_EMOJI_DIR, {
					maxAge: ms('30 days'),
				});
			},
		);

		fastify.get<{ Params: { path: string } }>(
			'/twemoji/:path(.*)',
			async (request, reply) => {
				const path = request.params.path;

				if (!path.match(/^[0-9a-f-]+\.svg$/)) {
					reply.code(404);
					return;
				}

				reply.header(
					'Content-Security-Policy',
					"default-src 'none'; style-src 'unsafe-inline'",
				);

				return await reply.sendFile(path, TWEMOJI_DIR, {
					maxAge: ms('30 days'),
				});
			},
		);

		fastify.get<{ Params: { path: string } }>(
			'/twemoji-badge/:path(.*)',
			async (request, reply) => {
				const path = request.params.path;

				if (!path.match(/^[0-9a-f-]+\.png$/)) {
					reply.code(404);
					return;
				}

				const mask = await sharp(
					TWEMOJI_DIR + `/${path.replace('.png', '')}.svg`,
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

				reply.header(
					'Content-Security-Policy',
					"default-src 'none'; style-src 'unsafe-inline'",
				);
				reply.header('Cache-Control', 'max-age=2592000');
				reply.header('Content-Type', 'image/png');
				return buffer;
			},
		);

		done();
	}
}
