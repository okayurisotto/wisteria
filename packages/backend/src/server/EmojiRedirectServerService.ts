/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { EmojisRepository, MiEmoji } from '@/models/_.js';
import { IsNull } from 'typeorm';

const parseEmoji = (
	value: string,
): { name: string; host: string | null } | null => {
	const matchResult = value.match(/^([\w+-]+)(?:@([\w.\-:]+))?\.webp$/);
	if (matchResult === null) return null;

	const name = matchResult[1];
	let host = matchResult[2] ?? null;

	// `@.` is the spec of ReactionService.decodeReaction
	if (host === '.') host = null;

	// ???
	if (name === undefined) return null;

	return { name, host };
};

const getEmojiUrl = (emoji: MiEmoji): string | null => {
	if (emoji.publicUrl !== '') return emoji.publicUrl;
	if (emoji.originalUrl !== '') return emoji.originalUrl;
	return null;
};

@Injectable()
export class EmojiRedirectServerService {
	private readonly fallbackUrl;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,
	) {
		this.fallbackUrl = new URL(
			'/static-assets/emoji-unknown.png',
			this.config.url,
		);
	}

	public async getProxiedUrl(
		value: string,
		mode: 'badge' | 'emoji',
		isStatic: boolean,
	): Promise<URL | null> {
		const parseResult = parseEmoji(value);
		if (parseResult === null) return null;

		const emoji = await this.emojisRepository.findOneBy({
			host: parseResult.host ?? IsNull(),
			name: parseResult.name,
		});

		if (emoji === null) return null;

		const emojiUrl = getEmojiUrl(emoji);
		if (emojiUrl === null) return null;

		switch (mode) {
			case 'badge': {
				const url = new URL(`${this.config.mediaProxy}/emoji.png`);

				url.searchParams.set('url', emojiUrl);
				url.searchParams.set('badge', '1');

				return url;
			}
			case 'emoji': {
				const url = new URL(`${this.config.mediaProxy}/emoji.webp`);

				url.searchParams.set('url', emojiUrl);
				url.searchParams.set('emoji', '1');
				if (isStatic) url.searchParams.set('static', '1');

				return url;
			}
			default: {
				return mode satisfies never;
			}
		}
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.get<{
			Params: { path: string };
			Querystring: { static?: unknown; badge?: unknown; fallback?: unknown };
		}>('/emoji/:path(.*)', async (request, reply) => {
			const proxiedUrl = await this.getProxiedUrl(
				request.params.path,
				'badge' in request.query ? 'badge' : 'emoji',
				'static' in request.query,
			);

			reply.header('Cache-Control', 'public, max-age=86400');
			reply.header(
				'Content-Security-Policy',
				"default-src 'none'; style-src 'unsafe-inline'",
			);

			if (proxiedUrl !== null) {
				return await reply.redirect(proxiedUrl.href);
			} else {
				if ('fallback' in request.query) {
					return await reply.redirect(this.fallbackUrl.href);
				} else {
					reply.code(404);
					return;
				}
			}
		});

		done();
	}
}
