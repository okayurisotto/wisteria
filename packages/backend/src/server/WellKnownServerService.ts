/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import vary from 'vary';
import fastifyAccepts from '@fastify/accepts';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { escapeAttribute, escapeValue } from '@/misc/prelude/xml.js';
import type { MiUser } from '@/models/User.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { bindThis } from '@/decorators.js';
import { NodeinfoServerService } from './NodeinfoServerService.js';
import { OAuth2ProviderService } from './oauth/OAuth2ProviderService.js';
import type { FindOptionsWhere } from 'typeorm';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

@Injectable()
export class WellKnownServerService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private nodeinfoServerService: NodeinfoServerService,
		private userEntityService: UserEntityService,
		private oauth2ProviderService: OAuth2ProviderService,
	) {}

	private toXRD(elements: { name: string, value?: string, attributes?: Record<string, string> }[]): string {
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

	private generateQueryFromAcct(acct: AcctEntity): FindOptionsWhere<MiUser> | null  {
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

	private generateQuery(resource: string): FindOptionsWhere<MiUser> | null  {
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

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		const ALL_PATH = '/.well-known/*';
		const WEB_FINGER_PATH = '/.well-known/webfinger';
		const JRD_MIMETYPE = 'application/jrd+json';
		const XRD_MIMETYPE = 'application/xrd+xml';

		fastify.register(fastifyAccepts);

		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('Access-Control-Allow-Headers', 'Accept');
			reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
			reply.header('Access-Control-Allow-Origin', '*');
			reply.header('Access-Control-Expose-Headers', 'Vary');
			done();
		});

		fastify.options(ALL_PATH, async (request, reply) => {
			reply.code(204);
		});

		fastify.get('/.well-known/host-meta', async (request, reply) => {
			reply.header('Content-Type', XRD_MIMETYPE);
			return this.toXRD([{
				name: 'Link',
				attributes: {
					rel: 'lrdd',
					type: XRD_MIMETYPE,
					template: `${this.config.url}${WEB_FINGER_PATH}?resource={uri}`,
				},
			}]);
		});

		fastify.get('/.well-known/host-meta.json', async (request, reply) => {
			reply.header('Content-Type', 'application/json');
			return {
				links: [{
					rel: 'lrdd',
					type: JRD_MIMETYPE,
					template: `${this.config.url}${WEB_FINGER_PATH}?resource={uri}`,
				}],
			};
		});

		fastify.get('/.well-known/nodeinfo', async (request, reply) => {
			return { links: this.nodeinfoServerService.getLinks() };
		});

		fastify.get('/.well-known/oauth-authorization-server', async () => {
			return this.oauth2ProviderService.generateRFC8414();
		});

		fastify.get<{ Querystring: { resource: string } }>(WEB_FINGER_PATH, async (request, reply) => {
			if (typeof request.query.resource !== 'string') {
				reply.code(400);
				return;
			}

			const query = this.generateQuery(request.query.resource.toLowerCase());

			if (query === null) {
				reply.code(422);
				return;
			}

			const user = await this.usersRepository.findOneBy(query);

			if (user === null) {
				reply.code(404);
				return;
			}

			const subject = AcctEntity.from(user.username, user.host, this.config.host).toAcctURI();
			const self = {
				rel: 'self',
				type: 'application/activity+json',
				href: this.userEntityService.genLocalUserUri(user.id),
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

			vary(reply.raw, 'Accept');
			reply.header('Cache-Control', 'public, max-age=180');

			if (request.accepts().type([JRD_MIMETYPE, XRD_MIMETYPE]) === XRD_MIMETYPE) {
				reply.type(XRD_MIMETYPE);
				return this.toXRD([
					{ name: 'Subject', value: subject },
					{ name: 'Link', attributes: self },
					{ name: 'Link', attributes: profilePage },
					{ name: 'Link', attributes: subscribe },
				]);
			} else {
				reply.type(JRD_MIMETYPE);
				return {
					subject,
					links: [self, profilePage, subscribe],
				};
			}
		});

		done();
	}
}
