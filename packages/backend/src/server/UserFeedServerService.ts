/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { Feed } from 'feed';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import type { UsersRepository } from '@/models/_.js';
import { FeedService } from '@/core/FeedService.js';
import { Hono } from 'hono';

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

	public createServer(): Hono {
		return new Hono().get('/:user{^@\\S+\\.(atom)|(rss)|(json)$}', async (c, next) => {
			const matchResult = c.req.param('user').match(/^@(\S+)\.((?:atom)|(?:rss)|(?:json))$/);
			if (matchResult === null) {
				await next();
				return;
			}

			const acct = matchResult[1];
			if (acct === undefined) return c.body(null, 500);

			const type = matchResult[2];
			if (type === undefined) return c.body(null, 500);

			const feed = await this.getFeed(acct);
			if (feed === null) return c.notFound();

			switch (type) {
				case 'atom': {
					c.header('Content-Type', 'application/atom+xml; charset=utf-8');
					return c.body(feed.atom1());
				}
				case 'rss': {
					c.header('Content-Type', 'application/rss+xml; charset=utf-8');
					return c.body(feed.rss2());
				}
				case 'json': {
					c.header('Content-Type', 'application/json; charset=utf-8');
					return c.body(feed.json1());
				}
				default: {
					return c.body(null, 500);
				}
			}
		});
	}
}
