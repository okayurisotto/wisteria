/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { EmojisRepository, MiEmoji } from '@/models/_.js';
import { IsNull } from 'typeorm';
import { Hono } from 'hono';

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

	public createServer(): Hono {
		return new Hono().get('/:path', async (c) => {
			const proxiedUrl = await this.getProxiedUrl(
				c.req.param('path'),
				c.req.query('badge') !== undefined ? 'badge' : 'emoji',
				c.req.query('static') !== undefined,
			);

			c.header('Cache-Control', 'public, max-age=86400');
			c.header(
				'Content-Security-Policy',
				'default-src \'none\'; style-src \'unsafe-inline\'',
			);

			if (proxiedUrl !== null) {
				return c.redirect(proxiedUrl.href);
			} else {
				if (c.req.query('fallback') !== undefined) {
					return c.redirect(this.fallbackUrl.href);
				} else {
					return c.notFound();
				}
			}
		});
	}
}
