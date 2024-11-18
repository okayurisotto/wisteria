/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { escapeAttribute, escapeValue } from '@/misc/prelude/xml.js';
import type { MiUser } from '@/models/User.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { NodeinfoServerService } from './NodeinfoServerService.js';
import type { FindOptionsWhere } from 'typeorm';
import { Hono, type MiddlewareHandler } from 'hono';
import { accepts } from 'hono/accepts';
import { UserUriService } from '@/core/entities/UserUriService.js';

@Injectable()
export class WellKnownServerService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly nodeinfoServerService: NodeinfoServerService,
		private readonly userUriService: UserUriService,
	) {}

	private toXRD(elements: { name: string; value?: string; attributes?: Record<string, string> }[]): string {
		const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';

		const elementsStr = elements
			.map(({ name, value, attributes }) => {
				const attributeEntries = Object.entries(attributes ?? {});

				const attributesStr = attributeEntries
					.map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
					.join(' ');

				if (value === undefined) {
					return `<${name} ${attributesStr}/>`;
				} else {
					return `<${name} ${attributesStr}>${escapeValue(value)}</${name}>`;
				}
			})
			.join('');

		return XML_DECL + `<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">${elementsStr}</XRD>`;
	};

	private generateQueryFromId(id: MiUser['id']): FindOptionsWhere<MiUser> {
		return {
			id,
			host: IsNull(),
			isSuspended: false,
		};
	};

	private generateQueryFromAcct(acct: AcctEntity): FindOptionsWhere<MiUser> | null {
		if (acct.host === null) {
			const query: FindOptionsWhere<MiUser> = {
				usernameLower: acct.username,
				host: IsNull(),
				isSuspended: false,
			};
			return query;
		} else {
			return null;
		}
	};

	private generateQuery(resource: string): FindOptionsWhere<MiUser> | null {
		if (resource.startsWith(`${this.config.url.toLowerCase()}/users/`)) {
			return this.generateQueryFromId(resource.split('/').at(-1));
		}

		if (resource.startsWith(`${this.config.url.toLowerCase()}/@`)) {
			const acct = AcctEntity.parse(resource.split('/').pop()!, this.config.host);
			if (acct !== null) return this.generateQueryFromAcct(acct);
		}

		if (resource.startsWith('acct:')) {
			const trimmed = resource.slice('acct:'.length);
			const acct = AcctEntity.parse(trimmed, this.config.host);
			if (acct !== null) return this.generateQueryFromAcct(acct);
		}

		const acct = AcctEntity.parse(resource, this.config.host);
		if (acct !== null) return this.generateQueryFromAcct(acct);

		return null;
	};

	public createServer(): Hono {
		const ALL_PATH = '/*';
		const WEB_FINGER_PATH = `${this.config.url}/.well-known/webfinger`;
		const JRD_MIMETYPE = 'application/jrd+json';
		const XRD_MIMETYPE = 'application/xrd+xml';

		const hono = new Hono();

		const setWellKnownHeaders: MiddlewareHandler = async (c, next) => {
			c.header('Access-Control-Allow-Headers', 'Accept');
			c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
			c.header('Access-Control-Allow-Origin', '*');
			c.header('Access-Control-Expose-Headers', 'Vary');

			await next();
		};

		hono.options(ALL_PATH, setWellKnownHeaders, (c) => {
			return c.body(null, 204);
		});

		hono.get('/host-meta', setWellKnownHeaders, (c) => {
			c.header('Content-Type', XRD_MIMETYPE);

			return c.body(this.toXRD([{
				name: 'Link',
				attributes: {
					rel: 'lrdd',
					type: XRD_MIMETYPE,
					template: `${WEB_FINGER_PATH}?resource={uri}`,
				},
			}]));
		});

		hono.get('/host-meta.json', setWellKnownHeaders, (c) => {
			return c.json({
				links: [{
					rel: 'lrdd',
					type: JRD_MIMETYPE,
					template: `${WEB_FINGER_PATH}?resource={uri}`,
				}],
			});
		});

		hono.get('/nodeinfo', setWellKnownHeaders, (c) => {
			return c.json({ links: this.nodeinfoServerService.getLinks() });
		});

		hono.get(`/webfinger`, setWellKnownHeaders, async (c) => {
			const resource = c.req.query('resource');
			if (typeof resource !== 'string') return c.body(null, 400);

			const query = this.generateQuery(resource.toLowerCase());
			if (query === null) return c.body(null, 422);

			const user = await this.usersRepository.findOneBy(query);
			if (user === null) return c.notFound();

			const subject = AcctEntity.from(user.username, user.host, this.config.host).toAcctURI();
			const self = {
				rel: 'self',
				type: 'application/activity+json',
				href: this.userUriService.genLocalUserUri(user.id),
			};
			const profilePage = {
				rel: 'http://webfinger.net/rel/profile-page',
				type: 'text/html',
				href: `${this.config.url}/@${user.username}`,
			};
			const subscribe = {
				rel: 'http://ostatus.org/schema/1.0/subscribe',
				template: `${this.config.url}/authorize-follow?acct={uri}`,
			};

			const accepted = accepts(c, {
				header: 'Accept',
				supports: [JRD_MIMETYPE, XRD_MIMETYPE],
				default: JRD_MIMETYPE,
			});
			c.header('Cache-Control', 'public, max-age=180');

			switch (accepted) {
				case JRD_MIMETYPE: {
					c.header('Content-Type', JRD_MIMETYPE);
					return c.json({
						subject,
						links: [self, profilePage, subscribe],
					});
				}
				case XRD_MIMETYPE: {
					c.header('Content-Type', XRD_MIMETYPE);
					return c.text(this.toXRD([
						{ name: 'Subject', value: subject },
						{ name: 'Link', attributes: self },
						{ name: 'Link', attributes: profilePage },
						{ name: 'Link', attributes: subscribe },
					]));
				}
				default: {
					return c.body(null, 400);
				}
			}
		});

		return hono;
	}
}
