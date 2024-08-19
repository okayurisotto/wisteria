/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import pug, { type compileTemplate } from 'pug';
import { In, IsNull } from 'typeorm';
import type { Config } from '@/config.js';
import { getNoteSummary } from '@/misc/get-note-summary.js';
import { DI } from '@/di-symbols.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { MetaService } from '@/core/MetaService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { PageEntityService } from '@/core/entities/PageEntityService.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import type { ChannelsRepository, ClipsRepository, FlashsRepository, GalleryPostsRepository, MiMeta, NotesRepository, PagesRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { UrlPreviewService } from './UrlPreviewService.js';
import { ClientLoggerService } from './ClientLoggerService.js';
import { PUG_DIR } from '@/path.js';
import { Hono, type MiddlewareHandler } from 'hono';
import path from 'node:path';
import { UserLiteEntityService } from '@/core/entities/UserLiteEntityService.js';

declare module 'hono' {
	interface ContextRenderer {
		(
			name: 'base' | 'bios' | 'channel' | 'cli' | 'clip' | 'error' | 'flash' | 'flush' | 'gallery-post' | 'note' | 'page' | 'user',
			locals: Record<string, unknown>
		): Response | Promise<Response>;
	}
}

@Injectable()
export class ClientServerService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.galleryPostsRepository)
		private readonly galleryPostsRepository: GalleryPostsRepository,

		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		@Inject(DI.clipsRepository)
		private readonly clipsRepository: ClipsRepository,

		@Inject(DI.pagesRepository)
		private readonly pagesRepository: PagesRepository,

		@Inject(DI.flashsRepository)
		private readonly flashsRepository: FlashsRepository,

		private readonly flashEntityService: FlashEntityService,
		private readonly noteEntityService: NoteEntityService,
		private readonly pageEntityService: PageEntityService,
		private readonly galleryPostEntityService: GalleryPostEntityService,
		private readonly clipEntityService: ClipEntityService,
		private readonly channelEntityService: ChannelEntityService,
		private readonly metaService: MetaService,
		private readonly urlPreviewService: UrlPreviewService,
		private readonly clientLoggerService: ClientLoggerService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	private generateCommonPugData(meta: MiMeta) {
		return {
			instanceName: meta.name ?? 'Wisteria',
			icon: meta.iconUrl,
			appleTouchIcon: meta.app512IconUrl,
			themeColor: meta.themeColor,
			serverErrorImageUrl: meta.serverErrorImageUrl ?? 'https://xn--931a.moe/assets/error.jpg',
			infoImageUrl: meta.infoImageUrl ?? 'https://xn--931a.moe/assets/info.jpg',
			notFoundImageUrl: meta.notFoundImageUrl ?? 'https://xn--931a.moe/assets/not-found.jpg',
			instanceUrl: this.config.url,
		};
	}

	public createServer(): Hono {
		const hono = new Hono();

		// クリックジャッキング防止のため
		const noIframe: MiddlewareHandler = async (c, next) => {
			c.header('X-Frame-Options', 'DENY');
			await next();
		};

		const usePug: MiddlewareHandler = async (c, next) => {
			const templates = new Map<string, compileTemplate>();

			c.setRenderer(async (name, locals) => {
				c.header('Cache-Control', 'public, max-age=30');

				const template = await (async () => {
					const cached = templates.get(name);
					if (cached !== undefined) return cached;

					const filepath = path.join(PUG_DIR, `${name}.pug`);
					const content = await fs.readFile(filepath, { encoding: 'utf-8' });
					const template = pug.compile(content, { basedir: PUG_DIR, filename: filepath });

					templates.set(name, template);

					return template;
				})();

				return c.html(template(locals));
			});

			await next();
		};

		const renderBase: MiddlewareHandler = async (c) => {
			const meta = await this.metaService.fetch();
			const locals = {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				img: meta.bannerUrl,
				url: this.config.url,
				title: meta.name ?? 'Wisteria',
				desc: meta.description,
			};

			return c.render('base', locals);
		};

		// URL preview endpoint
		hono.get('/url', async (c) => {
			return await this.urlPreviewService.handle(c);
		});

		// #region SSR (for crawlers)

		// User
		hono.get('/:user/:sub?', noIframe, usePug, async (c, next) => {
			const acctString = c.req.param('user');
			if (!acctString.startsWith('@')) {
				await next();
				return;
			}

			const acct = AcctEntity.parse(acctString, this.config.host);

			const user = acct !== null
				? await this.usersRepository.findOneByOrFail({
					usernameLower: acct.username.toLowerCase(),
					host: acct.host ?? IsNull(),
					isSuspended: false,
				})
				: null;

			if (user === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const meta = await this.metaService.fetch();
			const me = profile.fields
				.filter(filed => URL.canParse(filed.value))
				.map(field => field.value);
			return await c.render('user', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				user,
				profile,
				me,
				avatarUrl: user.avatarUrl ?? this.userLiteEntityService.getIdenticonUrl(user),
				sub: c.req.param('sub'),
			});
		});

		// User by ID
		hono.get('/users/:user', async (c) => {
			const user = await this.usersRepository.findOneBy({
				id: c.req.param('user'),
				host: IsNull(),
				isSuspended: false,
			});
			if (user === null) return c.notFound();

			const acct = AcctEntity.from(user.username, user.host, this.config.host);
			return c.redirect(`/@${acct.toShortString()}`);
		});

		// Note
		hono.get('/notes/:note', noIframe, usePug, async (c, next) => {
			const note = await this.notesRepository.findOneBy({
				id: c.req.param('note'),
				visibility: In(['public', 'home']),
			});

			if (note === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: note.userId });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const packedNote = await this.noteEntityService.pack(note);
			const meta = await this.metaService.fetch();
			return await c.render('note', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				note: packedNote,
				profile,
				avatarUrl: packedNote.user.avatarUrl,
				summary: getNoteSummary(packedNote),
			});
		});

		// Page
		hono.get('/:user{^@\\S+$}/pages/:page', noIframe, usePug, async (c, next) => {
			const acct = AcctEntity.parse(c.req.param('user'), this.config.host);
			if (acct === null) {
				await next();
				return;
			}

			const user = await this.usersRepository.findOneBy({
				usernameLower: acct.username.toLowerCase(),
				host: acct.host ?? IsNull(),
			});

			if (user === null) {
				await next();
				return;
			}

			const page = await this.pagesRepository.findOneBy({
				name: c.req.param('page'),
				userId: user.id,
			});
			if (page === null) {
				await next();
				return;
			}

			if (['public'].includes(page.visibility)) {
				c.header('Cache-Control', 'public, max-age=15');
			} else {
				c.header('Cache-Control', 'private, max-age=0, must-revalidate');
			}

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: page.userId });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const packedPage = await this.pageEntityService.pack(page);
			const meta = await this.metaService.fetch();
			return await c.render('page', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				page: packedPage,
				profile,
				avatarUrl: packedPage.user.avatarUrl,
			});
		});

		// Flash
		hono.get('/play/:id', noIframe, usePug, async (c, next) => {
			const flash = await this.flashsRepository.findOneBy({
				id: c.req.param('id'),
			});

			if (flash === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: flash.userId });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const packedFlash = await this.flashEntityService.pack(flash);
			const meta = await this.metaService.fetch();
			return await c.render('flash', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				flash: packedFlash,
				profile,
				avatarUrl: packedFlash.user.avatarUrl,
			});
		});

		// Clip
		hono.get('/clips/:clip', noIframe, usePug, async (c, next) => {
			const clip = await this.clipsRepository.findOneBy({
				id: c.req.param('clip'),
				isPublic: true,
			});

			if (clip === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: clip.userId });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const packedClip = await this.clipEntityService.pack(clip);
			const meta = await this.metaService.fetch();
			return await c.render('clip', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				clip: packedClip,
				profile,
				avatarUrl: packedClip.user.avatarUrl,
			});
		});

		// Gallery post
		hono.get('/gallery/:post', noIframe, usePug, async (c, next) => {
			const post = await this.galleryPostsRepository.findOneBy({
				id: c.req.param('post'),
			});

			if (post === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: post.userId });
			if (profile.preventAiLearning) {
				c.header('X-Robots-Tag', 'noimageai');
				c.header('X-Robots-Tag', 'noai');
			}

			const packedPost = await this.galleryPostEntityService.pack(post);
			const meta = await this.metaService.fetch();
			return await c.render('gallery-post', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				post: packedPost,
				profile,
				avatarUrl: packedPost.user.avatarUrl,
			});
		});

		// Channel
		hono.get('/channels/:channel', noIframe, usePug, async (c, next) => {
			const channel = await this.channelsRepository.findOneBy({
				id: c.req.param('channel'),
			});

			if (channel === null) {
				await next();
				return;
			}

			c.header('Cache-Control', 'public, max-age=15');

			const packedChannel = await this.channelEntityService.pack(channel);
			const meta = await this.metaService.fetch();
			return await c.render('channel', {
				...this.generateCommonPugData(meta),
				version: this.config.version,
				config: this.config,
				channel: packedChannel,
			});
		});

		// #endregion

		// BIOS
		hono.get('/bios', noIframe, usePug, async (c) => {
			return c.render('bios', {
				version: this.config.version,
				config: this.config,
			});
		});

		// CLI
		hono.get('/cli', noIframe, usePug, async (c) => {
			return c.render('cli', {
				version: this.config.version,
				config: this.config,
			});
		});

		// Flush
		hono.get('/flush', noIframe, usePug, async (c) => {
			return c.render('flush', {
				version: this.config.version,
				config: this.config,
			});
		});

		// `/streaming`に非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
		hono.get('/streaming', (c) => {
			return c.body(null, 503, {
				'Cache-Control': 'private, max-age=0',
			});
		});

		// Render base html for all requests
		hono.get('*', noIframe, usePug, renderBase);

		hono.onError(async (error, c) => {
			const errId = randomUUID();

			this.clientLoggerService.logger.error(`Internal error occurred in ${c.req.routePath}: ${error.message}`, {
				path: c.req.routePath,
				params: c.req.param(),
				query: c.req.queries(),
				code: error.name,
				stack: error.stack,
				id: errId,
			});

			const meta = await this.metaService.fetch();
			const locals = {
				version: this.config.version,
				config: this.config,
				code: 'UNKNOWN',
				id: errId,
				...this.generateCommonPugData(meta),
			};

			c.status(500);
			c.header('Cache-Control', 'max-age=10, must-revalidate');
			return await c.render('error', locals);
		});

		return hono;
	}
}
