/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { generate } from 'identicon-generator';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';

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

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.get<{ Params: { x: string } }>(
			'/identicon/:x',
			async (request, reply) => {
				reply.header('Content-Type', 'image/png');
				reply.header('Cache-Control', 'public, max-age=86400');

				const meta = await this.metaService.fetch();
				if (meta.enableIdenticonGeneration) {
					const buffer = await generate(request.params.x, {
						pixels: 5,
						cellSize: 12,
						margin: 30,
					});
					reply.send(buffer);
				} else {
					return reply.redirect(this.fallbackUrl);
				}
			},
		);

		done();
	}
}
