/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';
import {
	FRONTEND_ASSETS_DIR,
	FRONTEND_DIST_ASSETS_DIR,
	STATIC_ASSETS_DIR,
	SW_ASSETS_DIR,
	TARBALL_DIR,
	VITE_OUT_DIR,
} from '@/path.js';
import { Hono } from 'hono';
import { serveStaticDir, serveStaticFile } from 'hono-serve-static';
import { omitSearch } from './omitSearch.js';

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

	public createServer(): Hono {
		const hono = new Hono();

		// #region serveStaticDir

		hono.get(
			'/static-assets/*',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${7 * 24 * 60 * 60}`);
				await next();
			},
			serveStaticDir({
				path: STATIC_ASSETS_DIR,
				mountpoint: '/static-assets/',
				index: null,
			}),
		);

		hono.get(
			'/client-assets/*',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${7 * 24 * 60 * 60}`);
				await next();
			},
			serveStaticDir({
				path: FRONTEND_ASSETS_DIR,
				mountpoint: '/client-assets/',
				index: null,
			}),
		);

		hono.get(
			'/assets/*',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${7 * 24 * 60 * 60}`);
				await next();
			},
			serveStaticDir({
				path: FRONTEND_DIST_ASSETS_DIR,
				mountpoint: '/assets/',
				index: null,
			}),
		);

		hono.get(
			'/tarball/*',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${30 * 24 * 60 * 60}, immutable`);
				await next();
			},
			serveStaticDir({
				path: TARBALL_DIR,
				mountpoint: '/tarball/',
				index: null,
			}),
		);

		// #endregion

		// #region serveStaticFile

		hono.get(
			'/favicon.ico',
			omitSearch,
			serveStaticFile({ path: path.join(STATIC_ASSETS_DIR, 'favicon.ico') }),
		);

		hono.get(
			'/apple-touch-icon.png',
			omitSearch,
			serveStaticFile({ path: path.join(STATIC_ASSETS_DIR, 'apple-touch-icon.png') }),
		);

		hono.get(
			'/robots.txt',
			omitSearch,
			serveStaticFile({ path: path.join(STATIC_ASSETS_DIR, 'robots.txt') }),
		);

		hono.get(
			'/sw.js',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${10 * 60}`);
				await next();
			},
			serveStaticFile({ path: path.join(SW_ASSETS_DIR, '/sw.js') }),
		);

		// #endregion

		// #region vite assets

		hono.get(
			'/vite/*',
			omitSearch,
			async (c, next) => {
				c.header('Cache-Control', `max-age=${30 * 24 * 60 * 60}, immutable`);
				await next();
			},
			serveStaticDir({
				mountpoint: '/vite/',
				path: VITE_OUT_DIR,
				index: null,
			}),
		);

		// #endregion

		hono.get('/manifest.json', async (c) => {
			c.header('Cache-Control', 'max-age=300');
			return c.json(await this.manifestHandler());
		});

		hono.get('/opensearch.xml', async (c) => {
			c.header('Content-Type', 'application/opensearchdescription+xml');
			return c.body(await this.opensearchHandler());
		});

		return hono;
	}
}
