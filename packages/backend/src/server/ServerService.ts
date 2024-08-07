/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Server } from 'node:http';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Hono } from 'hono';
import { serve, type ServerType } from '@hono/node-server';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import type { Logger } from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { ActivityPubServerService } from './ActivityPubServerService.js';
import { NodeinfoServerService } from './NodeinfoServerService.js';
import { ApiServerService } from './api/ApiServerService.js';
import { StreamingApiServerService } from './api/StreamingApiServerService.js';
import { WellKnownServerService } from './WellKnownServerService.js';
import { FileServerService } from './FileServerService.js';
import { ClientServerService } from './web/ClientServerService.js';
import { OpenApiServerService } from './api/openapi/OpenApiServerService.js';
import { ActivityPubInboxServerService } from './ActivityPubInboxServerService.js';
import { EmojiRedirectServerService } from './EmojiRedirectServerService.js';
import { AvatarRedirectServerService } from './AvatarRedirectServerService.js';
import { IdenticonServerService } from './IdenticonServerService.js';
import { EmailVerificationServerService } from './EmailVerificationServerService.js';
import { StaticAssetsServerService } from './StaticAssetsServerService.js';
import { UserFeedServerService } from './UserFeedServerService.js';
import { EmojiServerService } from './EmojiServerService.js';
import { BullDashboardServerService } from './BullDashboardServerService.js';
import { FileProxyServerService } from './FileProxyServerService.js';

@Injectable()
export class ServerService implements OnApplicationShutdown {
	private logger: Logger;
	private server: ServerType | null = null;

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
		private activityPubInboxServerService: ActivityPubInboxServerService,
		private emojiRedirectServerService: EmojiRedirectServerService,
		private avatarRedirectServerService: AvatarRedirectServerService,
		private identiconServerService: IdenticonServerService,
		private emailVerificationServerService: EmailVerificationServerService,
		private staticAssetsServerService: StaticAssetsServerService,
		private userFeedServerService: UserFeedServerService,
		private emojiServerService: EmojiServerService,
		private bullDashboardServerService: BullDashboardServerService,
		private fileProxyServerService: FileProxyServerService,
	) {
		this.logger = this.loggerService.getLogger('server', 'gray');
	}

	public launch(): void {
		const hono = new Hono();

		// HSTS
		if (this.config.url.startsWith('https') && !this.config.disableHsts) {
			hono.use(async (c, next) => {
				// 6months (15552000sec)
				c.header('strict-transport-security', 'max-age=15552000; preload');
				await next();
			});
		}

		hono.route('/.well-known', this.wellKnownServerService.createServer());
		hono.route('/api', this.apiServerService.createServer());
		hono.route('/avatar', this.avatarRedirectServerService.createServer());
		hono.route('/emoji', this.emojiRedirectServerService.createServer());
		hono.route('/files', this.fileServerService.createServer());
		hono.route('/identicon', this.identiconServerService.createServer());
		hono.route('/nodeinfo', this.nodeinfoServerService.createServer());
		hono.route('/proxy', this.fileProxyServerService.createServer());
		hono.route('/queue', this.bullDashboardServerService.createServer());
		hono.route('/verify-email', this.emailVerificationServerService.createServer());

		hono.route('/', this.openApiServerService.createServer());
		hono.route('/', this.activityPubInboxServerService.createServer());
		hono.route('/', this.activityPubServerService.createServer());
		hono.route('/', this.staticAssetsServerService.createServer());
		hono.route('/', this.userFeedServerService.createServer());
		hono.route('/', this.emojiServerService.createServer());
		hono.route('/', this.clientServerService.createServer());

		const server = serve({
			fetch: hono.fetch,
			port: this.config.port,
		});
		this.server = server;

		server.on('listening', () => {
			this.logLaunch();

			if (this.server instanceof Server) {
				this.streamingApiServerService.attach(this.server);
			} else {
				this.logger.error('Couldn\'t attach WebSocket server.');
			}
		});
	}

	private logLaunch(): void {
		this.logger.succ(
			`Now listening on port ${this.config.port.toString()} on ${this.config.url}`,
			null,
			true,
		);
	}

	public async dispose(): Promise<void> {
		await this.streamingApiServerService.detach();
		this.server?.close();
	}

	async onApplicationShutdown(): Promise<void> {
		await this.dispose();
	}
}
