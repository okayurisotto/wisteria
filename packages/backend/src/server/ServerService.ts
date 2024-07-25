/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyRawBody from 'fastify-raw-body';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { ActivityPubServerService } from './ActivityPubServerService.js';
import { NodeinfoServerService } from './NodeinfoServerService.js';
import { ApiServerService } from './api/ApiServerService.js';
import { StreamingApiServerService } from './api/StreamingApiServerService.js';
import { WellKnownServerService } from './WellKnownServerService.js';
import { FileServerService } from './FileServerService.js';
import { ClientServerService } from './web/ClientServerService.js';
import { OpenApiServerService } from './api/openapi/OpenApiServerService.js';
import { OAuth2ProviderService } from './oauth/OAuth2ProviderService.js';
import { ActivityPubInboxServerService } from './ActivityPubInboxServerService.js';
import { EmojiRedirectServerService } from './EmojiRedirectServerService.js';
import { AvatarRedirectServerService } from './AvatarRedirectServerService.js';
import { IdenticonServerService } from './IdenticonServerService.js';
import { EmailVerificationServerService } from './EmailVerificationServerService.js';
import { StaticAssetsServerService } from './StaticAssetsServerService.js';
import { UserFeedServerService } from './UserFeedServerService.js';
import { EmojiServerService } from './EmojiServerService.js';

const _dirname = fileURLToPath(new URL('.', import.meta.url));

@Injectable()
export class ServerService implements OnApplicationShutdown {
	private logger: Logger;
	#fastify: FastifyInstance;

	constructor(
		@Inject(DI.config)
		private config: Config,

		private apiServerService: ApiServerService,
		private openApiServerService: OpenApiServerService,
		private streamingApiServerService: StreamingApiServerService,
		private activityPubServerService: ActivityPubServerService,
		private wellKnownServerService: WellKnownServerService,
		private nodeinfoServerService: NodeinfoServerService,
		private fileServerService: FileServerService,
		private clientServerService: ClientServerService,
		private loggerService: LoggerService,
		private oauth2ProviderService: OAuth2ProviderService,
		private activityPubInboxServerService: ActivityPubInboxServerService,
		private emojiRedirectServerService: EmojiRedirectServerService,
		private avatarRedirectServerService: AvatarRedirectServerService,
		private identiconServerService: IdenticonServerService,
		private emailVerificationServerService: EmailVerificationServerService,
		private staticAssetsServerService: StaticAssetsServerService,
		private userFeedServerService: UserFeedServerService,
		private emojiServerService: EmojiServerService,
	) {
		this.logger = this.loggerService.getLogger('server', 'gray');
	}

	@bindThis
	public async launch(): Promise<void> {
		const fastify = Fastify({
			trustProxy: true,
			logger: false,
		});
		this.#fastify = fastify;

		// HSTS
		// 6months (15552000sec)
		if (this.config.url.startsWith('https') && !this.config.disableHsts) {
			fastify.addHook('onRequest', (request, reply, done) => {
				reply.header('strict-transport-security', 'max-age=15552000; preload');
				done();
			});
		}

		// Register raw-body parser for ActivityPub HTTP signature validation.
		await fastify.register(fastifyRawBody, {
			global: false,
			encoding: null,
			runFirst: true,
		});

		// Register non-serving static server so that the child services can use reply.sendFile.
		// `root` here is just a placeholder and each call must use its own `rootPath`.
		fastify.register(fastifyStatic, {
			root: _dirname,
			serve: false,
		});

		fastify.register(this.apiServerService.createServer, { prefix: '/api' });
		fastify.register(this.openApiServerService.createServer);
		fastify.register(this.fileServerService.createServer);
		fastify.register(this.activityPubServerService.createServer);
		fastify.register(this.activityPubInboxServerService.createServer);
		fastify.register(this.nodeinfoServerService.createServer);
		fastify.register(this.wellKnownServerService.createServer);
		fastify.register(this.oauth2ProviderService.createServer, { prefix: '/oauth' });
		fastify.register(this.oauth2ProviderService.createTokenServer, { prefix: '/oauth/token' });
		fastify.register(this.emojiRedirectServerService.createServer);
		fastify.register(this.avatarRedirectServerService.createServer);
		fastify.register(this.identiconServerService.createServer);
		fastify.register(this.emailVerificationServerService.createServer);
		fastify.register(this.staticAssetsServerService.createServer);
		fastify.register(this.userFeedServerService.createServer);
		fastify.register(this.emojiServerService.createServer);
		fastify.register(this.clientServerService.createServer);

		this.streamingApiServerService.attach(fastify.server);

		fastify.server.on('error', err => {
			switch ((err as any).code) {
				case 'EACCES':
					this.logger.error(`You do not have permission to listen on port ${this.config.port}.`);
					break;
				case 'EADDRINUSE':
					this.logger.error(`Port ${this.config.port} is already in use by another process.`);
					break;
				default:
					this.logger.error(err);
					break;
			}

			process.exit(1);
		});

		if (this.config.socket) {
			if (fs.existsSync(this.config.socket)) {
				fs.unlinkSync(this.config.socket);
			}
			fastify.listen({ path: this.config.socket },
				() => {
					if (this.config.chmodSocket) {
						fs.chmodSync(this.config.socket!, this.config.chmodSocket);
					}
					this.logLaunch();
				},
			);
		} else {
			fastify.listen(
				{ port: this.config.port, host: '0.0.0.0' },
				() => {
					this.logLaunch();
				},
			);
		}

		await fastify.ready();
	}

	private logLaunch(): void {
		this.logger.succ(
			this.config.socket
				? `Now listening on socket ${this.config.socket} on ${this.config.url}`
				: `Now listening on port ${this.config.port.toString()} on ${this.config.url}`,
			null,
			true,
		);
	}

	@bindThis
	public async dispose(): Promise<void> {
		await this.streamingApiServerService.detach();
		await this.#fastify.close();
	}

	@bindThis
	async onApplicationShutdown(signal: string): Promise<void> {
		await this.dispose();
	}
}
