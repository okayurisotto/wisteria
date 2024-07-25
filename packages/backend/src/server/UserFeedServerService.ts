/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { Feed } from 'feed';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import type { UsersRepository } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { FeedService } from '@/core/FeedService.js';

@Injectable()
export class UserFeedServerService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly feedService: FeedService,
	) {}

	private async getFeed(acct: string): Promise<Feed | null> {
		const acctEntity = AcctEntity.parse(acct, this.config.host);
		if (acctEntity === null) return null;

		const user = await this.usersRepository.findOneBy({
			usernameLower: acctEntity.username.toLowerCase(),
			host: acctEntity.host ?? IsNull(),
			isSuspended: false,
		});
		if (user === null) return null;

		return await this.feedService.packFeed(user);
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.register(fastifyCookie, {});

		// Atom
		fastify.get<{ Params: { user: string } }>(
			'/@:user.atom',
			async (request, reply) => {
				const feed = await this.getFeed(request.params.user);

				if (feed) {
					reply.header('Content-Type', 'application/atom+xml; charset=utf-8');
					return feed.atom1();
				} else {
					reply.code(404);
					return;
				}
			},
		);

		// RSS
		fastify.get<{ Params: { user: string } }>(
			'/@:user.rss',
			async (request, reply) => {
				const feed = await this.getFeed(request.params.user);

				if (feed) {
					reply.header('Content-Type', 'application/rss+xml; charset=utf-8');
					return feed.rss2();
				} else {
					reply.code(404);
					return;
				}
			},
		);

		// JSON
		fastify.get<{ Params: { user: string } }>(
			'/@:user.json',
			async (request, reply) => {
				const feed = await this.getFeed(request.params.user);

				if (feed) {
					reply.header('Content-Type', 'application/json; charset=utf-8');
					return feed.json1();
				} else {
					reply.code(404);
					return;
				}
			},
		);

		done();
	}
}
