/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import pug from 'pug';
import { In, IsNull } from 'typeorm';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCookie from '@fastify/cookie';
import fastifyProxy from '@fastify/http-proxy';
import vary from 'vary';
import type { Config } from '@/config.js';
import { getNoteSummary } from '@/misc/get-note-summary.js';
import { DI } from '@/di-symbols.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { MetaService } from '@/core/MetaService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { PageEntityService } from '@/core/entities/PageEntityService.js';
import { GalleryPostEntityService } from '@/core/entities/GalleryPostEntityService.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import type { ChannelsRepository, ClipsRepository, FlashsRepository, GalleryPostsRepository, MiMeta, NotesRepository, PagesRepository, ReversiGamesRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { handleRequestRedirectToOmitSearch } from '@/misc/fastify-hook-handlers.js';
import { bindThis } from '@/decorators.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { ReversiGameEntityService } from '@/core/entities/ReversiGameEntityService.js';
import { UrlPreviewService } from './UrlPreviewService.js';
import { ClientLoggerService } from './ClientLoggerService.js';
import type { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import { PUG_DIR, VITE_OUT_DIR } from '@/path.js';
import { envOption } from '@/env.js';

@Injectable()
export class ClientServerService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.galleryPostsRepository)
		private galleryPostsRepository: GalleryPostsRepository,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.clipsRepository)
		private clipsRepository: ClipsRepository,

		@Inject(DI.pagesRepository)
		private pagesRepository: PagesRepository,

		@Inject(DI.flashsRepository)
		private flashsRepository: FlashsRepository,

		@Inject(DI.reversiGamesRepository)
		private reversiGamesRepository: ReversiGamesRepository,

		private flashEntityService: FlashEntityService,
		private userEntityService: UserEntityService,
		private noteEntityService: NoteEntityService,
		private pageEntityService: PageEntityService,
		private galleryPostEntityService: GalleryPostEntityService,
		private clipEntityService: ClipEntityService,
		private channelEntityService: ChannelEntityService,
		private reversiGameEntityService: ReversiGameEntityService,
		private metaService: MetaService,
		private urlPreviewService: UrlPreviewService,
		private clientLoggerService: ClientLoggerService,
	) {}

	@bindThis
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

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		fastify.register(fastifyCookie, {});

		fastify.register(fastifyView, {
			root: PUG_DIR,
			engine: {
				pug: pug,
			},
			defaultContext: {
				version: this.config.version,
				config: this.config,
			},
		});

		fastify.addHook('onRequest', (request, reply, done) => {
			// クリックジャッキング防止のためiFrameの中に入れられないようにする
			reply.header('X-Frame-Options', 'DENY');
			done();
		});

		//#region vite assets
		if (this.config.clientManifestExists) {
			fastify.register((fastify, options, done) => {
				fastify.register(fastifyStatic, {
					root: VITE_OUT_DIR,
					prefix: '/vite/',
					maxAge: ms('30 days'),
					immutable: true,
					decorateReply: false,
				});
				fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);
				done();
			});
		} else {
			fastify.register(fastifyProxy, {
				upstream: 'http://localhost:' + envOption.VITE_PORT,
				prefix: '/vite',
				rewritePrefix: '/vite',
			});
		}
		//#endregion

		const renderBase = async (reply: FastifyReply) => {
			const meta = await this.metaService.fetch();
			reply.header('Cache-Control', 'public, max-age=30');
			return await reply.view('base', {
				img: meta.bannerUrl,
				url: this.config.url,
				title: meta.name ?? 'Wisteria',
				desc: meta.description,
				...this.generateCommonPugData(meta),
			});
		};

		// URL preview endpoint
		fastify.get<{ Querystring: { url: string; lang: string; } }>('/url', (request, reply) => this.urlPreviewService.handle(request, reply));

		//#region SSR (for crawlers)
		// User
		fastify.get<{ Params: { user: string; sub?: string; } }>('/@:user/:sub?', async (request, reply) => {
			const acct = AcctEntity.parse(request.params.user, this.config.host);

			const user = acct !== null
				? await this.usersRepository.findOneByOrFail({
						usernameLower: acct.username.toLowerCase(),
						host: acct.host ?? IsNull(),
						isSuspended: false,
					})
				: null;

			vary(reply.raw, 'Accept');

			if (user != null) {
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });
				const meta = await this.metaService.fetch();
				const me = profile.fields
					? profile.fields
						.filter(filed => filed.value != null && filed.value.match(/^https?:/))
						.map(field => field.value)
					: [];

				reply.header('Cache-Control', 'public, max-age=15');
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('user', {
					user, profile, me,
					avatarUrl: user.avatarUrl ?? this.userEntityService.getIdenticonUrl(user),
					sub: request.params.sub,
					...this.generateCommonPugData(meta),
				});
			} else {
				// リモートユーザーなので
				// モデレータがAPI経由で参照可能にするために404にはしない
				return await renderBase(reply);
			}
		});

		fastify.get<{ Params: { user: string; } }>('/users/:user', async (request, reply) => {
			const user = await this.usersRepository.findOneBy({
				id: request.params.user,
				host: IsNull(),
				isSuspended: false,
			});

			if (user == null) {
				reply.code(404);
				return;
			}

			vary(reply.raw, 'Accept');

			reply.redirect(`/@${user.username}${ user.host == null ? '' : '@' + user.host}`);
		});

		// Note
		fastify.get<{ Params: { note: string; } }>('/notes/:note', async (request, reply) => {
			vary(reply.raw, 'Accept');

			const note = await this.notesRepository.findOneBy({
				id: request.params.note,
				visibility: In(['public', 'home']),
			});

			if (note) {
				const _note = await this.noteEntityService.pack(note);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: note.userId });
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=15');
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('note', {
					note: _note,
					profile,
					avatarUrl: _note.user.avatarUrl,
					// TODO: Let locale changeable by instance setting
					summary: getNoteSummary(_note),
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Page
		fastify.get<{ Params: { user: string; page: string; } }>('/@:user/pages/:page', async (request, reply) => {
			const acct = AcctEntity.parse(request.params.user, this.config.host);
			if (acct === null) return;

			const user = await this.usersRepository.findOneBy({
				usernameLower: acct.username.toLowerCase(),
				host: acct.host ?? IsNull(),
			});

			if (user === null) return;

			const page = await this.pagesRepository.findOneBy({
				name: request.params.page,
				userId: user.id,
			});

			if (page) {
				const _page = await this.pageEntityService.pack(page);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: page.userId });
				const meta = await this.metaService.fetch();
				if (['public'].includes(page.visibility)) {
					reply.header('Cache-Control', 'public, max-age=15');
				} else {
					reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
				}
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('page', {
					page: _page,
					profile,
					avatarUrl: _page.user.avatarUrl,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Flash
		fastify.get<{ Params: { id: string; } }>('/play/:id', async (request, reply) => {
			const flash = await this.flashsRepository.findOneBy({
				id: request.params.id,
			});

			if (flash) {
				const _flash = await this.flashEntityService.pack(flash);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: flash.userId });
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=15');
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('flash', {
					flash: _flash,
					profile,
					avatarUrl: _flash.user.avatarUrl,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Clip
		fastify.get<{ Params: { clip: string; } }>('/clips/:clip', async (request, reply) => {
			const clip = await this.clipsRepository.findOneBy({
				id: request.params.clip,
			});

			if (clip && clip.isPublic) {
				const _clip = await this.clipEntityService.pack(clip);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: clip.userId });
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=15');
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('clip', {
					clip: _clip,
					profile,
					avatarUrl: _clip.user.avatarUrl,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Gallery post
		fastify.get<{ Params: { post: string; } }>('/gallery/:post', async (request, reply) => {
			const post = await this.galleryPostsRepository.findOneBy({ id: request.params.post });

			if (post) {
				const _post = await this.galleryPostEntityService.pack(post);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: post.userId });
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=15');
				if (profile.preventAiLearning) {
					reply.header('X-Robots-Tag', 'noimageai');
					reply.header('X-Robots-Tag', 'noai');
				}
				return await reply.view('gallery-post', {
					post: _post,
					profile,
					avatarUrl: _post.user.avatarUrl,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Channel
		fastify.get<{ Params: { channel: string; } }>('/channels/:channel', async (request, reply) => {
			const channel = await this.channelsRepository.findOneBy({
				id: request.params.channel,
			});

			if (channel) {
				const _channel = await this.channelEntityService.pack(channel);
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('channel', {
					channel: _channel,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Reversi game
		fastify.get<{ Params: { game: string; } }>('/reversi/g/:game', async (request, reply) => {
			const game = await this.reversiGamesRepository.findOneBy({
				id: request.params.game,
			});

			if (game) {
				const _game = await this.reversiGameEntityService.packDetail(game);
				const meta = await this.metaService.fetch();
				reply.header('Cache-Control', 'public, max-age=3600');
				return await reply.view('reversi-game', {
					game: _game,
					...this.generateCommonPugData(meta),
				});
			} else {
				return await renderBase(reply);
			}
		});
		//#endregion

		fastify.get('/bios', async (request, reply) => {
			return await reply.view('bios', {
				version: this.config.version,
			});
		});

		fastify.get('/cli', async (request, reply) => {
			return await reply.view('cli', {
				version: this.config.version,
			});
		});

		fastify.get('/flush', async (request, reply) => {
			return await reply.view('flush');
		});

		// streamingに非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
		fastify.get('/streaming', async (request, reply) => {
			reply.code(503);
			reply.header('Cache-Control', 'private, max-age=0');
		});

		// Render base html for all requests
		fastify.get('*', async (request, reply) => {
			return await renderBase(reply);
		});

		fastify.setErrorHandler(async (error, request, reply) => {
			const errId = randomUUID();
			this.clientLoggerService.logger.error(`Internal error occurred in ${request.routeOptions.url}: ${error.message}`, {
				path: request.routeOptions.url,
				params: request.params,
				query: request.query,
				code: error.name,
				stack: error.stack,
				id: errId,
			});
			reply.code(500);
			reply.header('Cache-Control', 'max-age=10, must-revalidate');
			return await reply.view('error', {
				code: error.code,
				id: errId,
			});
		});

		done();
	}
}
