/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import fastifyStatic from '@fastify/static';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';
import { handleRequestRedirectToOmitSearch } from '@/misc/fastify-hook-handlers.js';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
	FRONTEND_ASSETS_DIR,
	FRONTEND_DIST_ASSETS_DIR,
	STATIC_ASSETS_DIR,
	SW_ASSETS_DIR,
	TARBALL_DIR,
} from '@/path.js';

@Injectable()
export class StaticAssetsServerService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly metaService: MetaService,
	) {}

	private async manifestHandler() {
		const instance = await this.metaService.fetch();

		const manifest = {
			// 空文字列の場合右辺を使いたいため
			short_name: instance.shortName || instance.name || this.config.host,
			// 空文字列の場合右辺を使いたいため
			name: instance.name || this.config.host,
			start_url: '/',
			display: 'standalone',
			background_color: '#313a42',
			// 空文字列の場合右辺を使いたいため
			theme_color: instance.themeColor || '#86b300',
			icons: [
				{
					// 空文字列の場合右辺を使いたいため
					src: instance.app192IconUrl || '/static-assets/icons/192.png',
					sizes: '192x192',
					type: 'image/png',
					purpose: 'maskable',
				},
				{
					// 空文字列の場合右辺を使いたいため
					src: instance.app512IconUrl || '/static-assets/icons/512.png',
					sizes: '512x512',
					type: 'image/png',
					purpose: 'maskable',
				},
				{
					src: '/static-assets/splash.png',
					sizes: '300x300',
					type: 'image/png',
					purpose: 'any',
				},
			],
			share_target: {
				action: '/share/',
				method: 'GET',
				enctype: 'application/x-www-form-urlencoded',
				params: {
					title: 'title',
					text: 'text',
					url: 'url',
				},
			},
		};

		const overrideManifest =
			instance.manifestJsonOverride === ''
				? {}
				: JSON.parse(instance.manifestJsonOverride);

		return {
			...manifest,
			...overrideManifest,
		};
	}

	private async opensearchHandler(): Promise<string> {
		const meta = await this.metaService.fetch();

		const name = meta.name ?? 'Wisteria';
		const content = [
			'<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">',
			`<ShortName>${name}</ShortName>`,
			`<Description>${name} Search</Description>`,
			'<InputEncoding>UTF-8</InputEncoding>',
			`<Image width="16" height="16" type="image/x-icon">${this.config.url}/favicon.ico</Image>`,
			`<Url type="text/html" template="${this.config.url}/search?q={searchTerms}"/>`,
			'</OpenSearchDescription>',
		].join('');

		return content;
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);

		//#region Fastify Static

		fastify.register(fastifyStatic, {
			root: STATIC_ASSETS_DIR,
			prefix: '/static-assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register(fastifyStatic, {
			root: FRONTEND_ASSETS_DIR,
			prefix: '/client-assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register(fastifyStatic, {
			root: FRONTEND_DIST_ASSETS_DIR,
			prefix: '/assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register(fastifyStatic, {
			root: TARBALL_DIR,
			prefix: '/tarball/',
			maxAge: ms('30 days'),
			immutable: true,
			decorateReply: false,
		});

		//#endregion

		//#region reply.sendFile()

		fastify.get('/favicon.ico', async (_, reply) => {
			return reply.sendFile('/favicon.ico', STATIC_ASSETS_DIR);
		});

		fastify.get('/apple-touch-icon.png', async (_, reply) => {
			return reply.sendFile('/apple-touch-icon.png', STATIC_ASSETS_DIR);
		});

		fastify.get('/sw.js', async (_, reply) => {
			return await reply.sendFile('/sw.js', SW_ASSETS_DIR, {
				maxAge: ms('10 minutes'),
			});
		});

		fastify.get('/robots.txt', async (_, reply) => {
			return await reply.sendFile('/robots.txt', STATIC_ASSETS_DIR);
		});

		//#endregion

		fastify.get('/manifest.json', async (_, reply) => {
			reply.header('Cache-Control', 'max-age=300');
			return await this.manifestHandler();
		});

		fastify.get('/opensearch.xml', async (_, reply) => {
			reply.header('Content-Type', 'application/opensearchdescription+xml');
			return await this.opensearchHandler();
		});

		done();
	}
}
