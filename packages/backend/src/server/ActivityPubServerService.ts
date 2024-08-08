/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets, In, IsNull, LessThan, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { FollowingsRepository, NotesRepository, EmojisRepository, NoteReactionsRepository, UserProfilesRepository, UserNotePiningsRepository, UsersRepository, FollowRequestsRepository } from '@/models/_.js';
import * as url from '@/misc/prelude/url.js';
import type { Config } from '@/config.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';
import { UserKeypairService } from '@/core/UserKeypairService.js';
import type { MiFollowing } from '@/models/Following.js';
import type { MiNote } from '@/models/Note.js';
import { QueryService } from '@/core/QueryService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { isPureRenote } from '@/misc/is-pure-renote.js';
import type { FindOptionsWhere } from 'typeorm';
import { Hono, type Context } from 'hono';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { isLocalUser } from '@/misc/isLocalUser.js';

const ACTIVITY_JSON = 'application/activity+json; charset=utf-8';
const LD_JSON = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';
const HTML = 'text/html';

@Injectable()
export class ActivityPubServerService {
	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		@Inject(DI.userNotePiningsRepository)
		private readonly userNotePiningsRepository: UserNotePiningsRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		private readonly utilityService: UtilityService,
		private readonly apRendererService: ApRendererService,
		private readonly userKeypairService: UserKeypairService,
		private readonly queryService: QueryService,
	) {}

	private async packActivity(note: MiNote) {
		if (isPureRenote(note)) {
			const renote = await this.notesRepository.findOneByOrFail({ id: note.renoteId });
			return this.apRendererService.renderAnnounce(renote.uri ? renote.uri : `${this.config.url}/notes/${renote.id}`, note);
		}

		return this.apRendererService.renderCreate(await this.apRendererService.renderNote(note, false), note);
	}

	public createServer(): Hono {
		const hono = new Hono();

		const setApHeaders = (c: Context) => {
			c.header('Access-Control-Allow-Headers', 'Accept');
			c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
			c.header('Access-Control-Allow-Origin', '*');
			c.header('Access-Control-Expose-Headers', 'Vary');
		};

		// #region Note

		const accepts = (c: Context) => {
			const value = c.req.header('Accept');
			if (value === undefined) return HTML;

			if (value === 'application/activity+json' ||
				value.startsWith('application/activity+json;') ||
				value.startsWith('application/activity+json,')) {
				return ACTIVITY_JSON;
			}

			if (value === 'application/ld+json' ||
				value.startsWith('application/ld+json;') ||
				value.startsWith('application/ld+json,')) {
				return LD_JSON;
			}

			return HTML;
		};

		// note
		hono.get('/notes/:note', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const note = await this.notesRepository.findOneBy({
				id: c.req.param('note'),
				visibility: In(['public', 'home']),
				localOnly: false,
			});
			if (note === null) return c.notFound();

			// リモートだったらリダイレクト
			if (note.userHost !== null) {
				if (note.uri === null || this.utilityService.isSelfHost(note.userHost)) {
					return c.body(null, 500);
				} else {
					return c.redirect(note.uri);
				}
			}

			c.header('Cache-Control', 'public, max-age=180');
			c.header('Content-Type', accepted);
			return c.body(JSON.stringify(this.apRendererService.addContext(await this.apRendererService.renderNote(note, false))));
		});

		// note activity
		hono.get('/notes/:note/activity', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const note = await this.notesRepository.findOneBy({
				id: c.req.param('note'),
				userHost: IsNull(),
				visibility: In(['public', 'home']),
				localOnly: false,
			});
			if (note === null) return c.notFound();

			c.header('Cache-Control', 'public, max-age=180');
			c.header('Content-Type', accepted);
			return c.body(JSON.stringify(this.apRendererService.addContext(await this.packActivity(note))));
		});

		// #endregion

		// #region User

		// user
		hono.get('/users/:user', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const user = await this.usersRepository.findOneBy({
				id: c.req.param('user'),
				host: IsNull(),
				isSuspended: false,
			});
			if (user === null) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(await this.apRendererService.renderPerson(user as MiLocalUser))));
		});

		// user publickey
		hono.get('/users/:user/publickey', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const user = await this.usersRepository.findOneBy({
				id: c.req.param('user'),
				host: IsNull(),
			});
			if (user === null) return c.notFound();

			const keypair = await this.userKeypairService.getUserKeypair(user.id);

			if (isLocalUser(user)) {
				c.header('Content-Type', accepted);
				c.header('Cache-Control', 'public, max-age=180');
				return c.body(JSON.stringify(this.apRendererService.addContext(this.apRendererService.renderKey(user, keypair))));
			} else {
				return c.body(null, 400);
			}
		});

		// user
		hono.get('/:user{^@\\S+$}', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			const acct = AcctEntity.parse(c.req.param('user'), this.config.host);
			if (acct === null || acct.host !== null) {
				await next();
				return;
			}

			setApHeaders(c);

			const user = await this.usersRepository.findOneBy({
				usernameLower: acct.username,
				host: IsNull(),
				isSuspended: false,
			});
			if (user === null) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(await this.apRendererService.renderPerson(user as MiLocalUser))));
		});

		// user outbox
		hono.get('/users/:user/outbox', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const userId = c.req.param('user');

			const page = c.req.query('page') === 'true';

			const sinceId = c.req.query('since_id');
			const untilId = c.req.query('until_id');
			if (sinceId !== undefined && untilId !== undefined) return c.body(null, 400);

			const user = await this.usersRepository.findOneBy({
				id: userId,
				host: IsNull(),
			});
			if (user === null) return c.notFound();

			const limit = 20;
			const partOf = `${this.config.url}/users/${userId}/outbox`;

			if (page) {
				const query = this.queryService.makePaginationQuery(
					this.notesRepository.createQueryBuilder('note'),
					sinceId,
					untilId,
				)
					.andWhere('note.userId = :userId', { userId: user.id })
					.andWhere(new Brackets((qb) => {
						qb
							.where('note.visibility = \'public\'')
							.orWhere('note.visibility = \'home\'');
					}))
					.andWhere('note.localOnly = FALSE');

				const notes = await query.limit(limit).getMany();

				if (sinceId) notes.reverse();

				const activities = await Promise.all(notes.map(note => this.packActivity(note)));

				const rendered: unknown = this.apRendererService.renderOrderedCollectionPage(
					`${partOf}?${url.query({ page: 'true', since_id: sinceId, until_id: untilId })}`,
					user.notesCount,
					activities,
					partOf,
					notes.length
						? `${partOf}?${url.query({ page: 'true', since_id: notes[0].id })}`
						: undefined,
					notes.length
						? `${partOf}?${url.query({ page: 'true', until_id: notes.at(-1)!.id })}`
						: undefined,
				);

				c.header('Content-Type', accepted);
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			} else {
				// index page
				const rendered: unknown = this.apRendererService.renderOrderedCollection(
					partOf,
					user.notesCount,
					`${partOf}?page=true`,
					`${partOf}?page=true&since_id=000000000000000000000000`,
				);

				c.header('Content-Type', accepted);
				c.header('Cache-Control', 'public, max-age=180');
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			}
		});

		// followers
		hono.get('/users/:user/followers', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const userId = c.req.param('user');
			const cursor = c.req.query('cursor');
			const page = c.req.query('page') === 'true';

			const user = await this.usersRepository.findOneBy({
				id: userId,
				host: IsNull(),
			});
			if (user === null) return c.notFound();

			// #region Check ff visibility

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			if (profile.followersVisibility === 'private' || profile.followersVisibility === 'followers') {
				return c.body(null, 403, { 'Cache-Control': 'public, max-age=30' });
			}

			// #endregion

			const limit = 10;
			const partOf = `${this.config.url}/users/${userId}/followers`;

			if (page) {
				const query: FindOptionsWhere<MiFollowing> = {
					followeeId: user.id,
				};

				// カーソルが指定されている場合
				if (cursor) {
					query.id = LessThan(cursor);
				}

				// Get followers
				const followings = await this.followingsRepository.find({
					where: query,
					take: limit + 1,
					order: { id: -1 },
				});

				// 「次のページ」があるかどうか
				const inStock = followings.length === limit + 1;
				if (inStock) followings.pop();

				const renderedFollowers = await Promise.all(
					followings.map(following => this.apRendererService.renderFollowUser(following.followerId)),
				);

				const rendered: unknown = this.apRendererService.renderOrderedCollectionPage(
					`${partOf}?${url.query({ page: 'true', cursor })}`,
					user.followersCount, renderedFollowers, partOf,
					undefined,
					inStock
						? `${partOf}?${url.query({ page: 'true', cursor: followings.at(-1)!.id })}`
						: undefined,
				);

				c.header('Content-Type', accepted);
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			} else {
				// index page
				const rendered: unknown = this.apRendererService.renderOrderedCollection(
					partOf,
					user.followersCount,
					`${partOf}?page=true`,
				);

				c.header('Content-Type', accepted);
				c.header('Cache-Control', 'public, max-age=180');
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			}
		});

		// following
		hono.get('/users/:user/following', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const userId = c.req.param('user');
			const cursor = c.req.query('cursor');
			const page = c.req.query('page') === 'true';

			const user = await this.usersRepository.findOneBy({
				id: userId,
				host: IsNull(),
			});
			if (user === null) return c.notFound();

			// #region Check ff visibility

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			if (profile.followingVisibility === 'private' || profile.followingVisibility === 'followers') {
				return c.body(null, 403, { 'Cache-Control': 'public, max-age=30' });
			}

			// #endregion

			const limit = 10;
			const partOf = `${this.config.url}/users/${userId}/following`;

			if (page) {
				const query: FindOptionsWhere<MiFollowing> = {
					followerId: user.id,
				};

				// カーソルが指定されている場合
				if (cursor) {
					query.id = LessThan(cursor);
				}

				// Get followings
				const followings = await this.followingsRepository.find({
					where: query,
					take: limit + 1,
					order: { id: -1 },
				});

				// 「次のページ」があるかどうか
				const inStock = followings.length === limit + 1;
				if (inStock) followings.pop();

				const renderedFollowees = await Promise.all(followings.map(following => this.apRendererService.renderFollowUser(following.followeeId)));
				const rendered: unknown = this.apRendererService.renderOrderedCollectionPage(
					`${partOf}?${url.query({ page: 'true', cursor })}`,
					user.followingCount, renderedFollowees, partOf,
					undefined,
					inStock
						? `${partOf}?${url.query({ page: 'true', cursor: followings.at(-1)!.id })}`
						: undefined,
				);

				c.header('Content-Type', accepted);
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			} else {
				// index page
				const rendered = this.apRendererService.renderOrderedCollection(
					partOf,
					user.followingCount,
					`${partOf}?page=true`,
				);

				c.header('Content-Type', accepted);
				c.header('Cache-Control', 'public, max-age=180');
				return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
			}
		});

		// featured
		hono.get('/users/:user/collections/featured', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const userId = c.req.param('user');

			const user = await this.usersRepository.findOneBy({
				id: userId,
				host: IsNull(),
			});
			if (user === null) return c.notFound();

			const pinings = await this.userNotePiningsRepository.find({
				where: { userId: user.id },
				order: { id: 'DESC' },
			});

			const pinnedNotes = (await Promise.all(
				pinings.map((pining) => {
					return this.notesRepository.findOneByOrFail({ id: pining.noteId });
				}),
			)).filter(note => !note.localOnly && ['public', 'home'].includes(note.visibility));

			const renderedNotes = await Promise.all(pinnedNotes.map(note => this.apRendererService.renderNote(note)));

			const rendered: unknown = this.apRendererService.renderOrderedCollection(
				`${this.config.url}/users/${userId}/collections/featured`,
				renderedNotes.length,
				undefined,
				undefined,
				renderedNotes,
			);

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(rendered)));
		});

		// #endregion

		// #region Emoji

		hono.get('/emojis/:emoji', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const emoji = await this.emojisRepository.findOneBy({
				host: IsNull(),
				name: c.req.param('emoji'),
			});
			if (emoji === null || emoji.localOnly) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(this.apRendererService.renderEmoji(emoji))));
		});

		// #endregion

		// #region Like

		hono.get('/likes/:like', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const reaction = await this.noteReactionsRepository.findOneBy({
				id: c.req.param('like'),
			});
			if (reaction === null) return c.notFound();

			const note = await this.notesRepository.findOneBy({ id: reaction.noteId });
			if (note === null) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(await this.apRendererService.renderLike(reaction, note))));
		});

		// #endregion

		// #region Follow

		// This may be used before the follow is completed, so we do not
		// check if the following exists.
		hono.get('/follows/:follower/:followee', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			const [follower, followee] = await Promise.all([
				this.usersRepository.findOneBy({
					id: c.req.param('follower'),
					host: IsNull(),
				}),
				this.usersRepository.findOneBy({
					id: c.req.param('followee'),
					host: Not(IsNull()),
				}),
			]) as [MiLocalUser | MiRemoteUser | null, MiLocalUser | MiRemoteUser | null];
			if (follower == null || followee == null) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(this.apRendererService.renderFollow(follower, followee))));
		});

		// #endregion

		// #region Follow Requests

		hono.get('/follows/:followRequestId', async (c, next) => {
			const accepted = accepts(c);
			if (accepted === HTML) {
				await next();
				return;
			}

			setApHeaders(c);

			// This may be used before the follow is completed, so we do not
			// check if the following exists and only check if the follow request exists.

			const followRequest = await this.followRequestsRepository.findOneBy({
				id: c.req.param('followRequestId'),
			});
			if (followRequest === null) return c.notFound();

			const [follower, followee] = await Promise.all([
				this.usersRepository.findOneBy({
					id: followRequest.followerId,
					host: IsNull(),
				}),
				this.usersRepository.findOneBy({
					id: followRequest.followeeId,
					host: Not(IsNull()),
				}),
			]) as [MiLocalUser | MiRemoteUser | null, MiLocalUser | MiRemoteUser | null];
			if (follower == null || followee == null) return c.notFound();

			c.header('Content-Type', accepted);
			c.header('Cache-Control', 'public, max-age=180');
			return c.body(JSON.stringify(this.apRendererService.addContext(this.apRendererService.renderFollow(follower, followee))));
		});

		// #endregion

		return hono;
	}
}
