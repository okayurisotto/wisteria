/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Config } from '@/config.js';
import type { InstancesRepository, AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import endpoints from './endpoints.js';
import { ApiCallService } from './ApiCallService.js';
import { SignupApiService } from './SignupApiService.js';
import { SigninApiService } from './SigninApiService.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';

@Injectable()
export class ApiServerService {
	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI.config)
		private config: Config,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private userEntityService: UserEntityService,
		private apiCallService: ApiCallService,
		private signupApiService: SignupApiService,
		private signinApiService: SigninApiService,
	) {}

	public createServer(): Hono {
		const hono = new Hono();

		const disableCache: MiddlewareHandler = async (c, next) => {
			c.header('Cache-Control', 'private, max-age=0, must-revalidate');
			await next();
		};

		hono.use(cors({ origin: '*' }), disableCache);

		for (const endpoint of endpoints) {
			const ep = {
				name: endpoint.name,
				meta: endpoint.meta,
				params: endpoint.params,
				exec: this.moduleRef.get('ep:' + endpoint.name, { strict: false }).exec,
			};

			const methods = ep.meta.allowGet ? ['GET', 'POST'] : ['POST'];

			const limit = endpoint.meta.requireFile
				? bodyLimit({ maxSize: this.config.maxFileSize ?? 262144000 })
				: bodyLimit({ maxSize: 1024 * 1024 });

			hono.on(methods, '/' + endpoint.name, limit, async (c) => {
				const liteResponse = await this.apiCallService.handleRequest(ep, c);
				return liteResponse.reply(c);
			});
		}

		hono.post('/signup', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
			return await this.signupApiService.signup(c);
		});

		hono.post('/signin', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
			return await this.signinApiService.signin(c);
		});

		hono.post('/signup-pending', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
			return await this.signupApiService.signupPending(c);
		});

		hono.get('/v1/instance/peers', async (c) => {
			const instances = await this.instancesRepository.find({
				select: ['host'],
				where: {
					isSuspended: false,
				},
			});

			return c.json(instances.map(instance => instance.host));
		});

		hono.post('/miauth/:session/check', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
			const token = await this.accessTokensRepository.findOneBy({
				session: c.req.param('session'),
			});

			if (token && token.session != null && !token.fetched) {
				await this.accessTokensRepository.update(token.id, {
					fetched: true,
				});

				return c.json({
					ok: true,
					token: token.token,
					user: await this.userEntityService.pack(token.userId, null, { schema: 'UserDetailedNotMe' }),
				});
			} else {
				return c.json({
					ok: false,
				});
			}
		});

		// Make sure any unknown path under /api returns HTTP 404 Not Found,
		// because otherwise ClientServerService will return the base client HTML
		// page with HTTP 200.
		hono.get('*', (c) => {
			c.status(404);

			// Mock ApiCallService.send's error handling
			return c.json({
				error: {
					message: 'Unknown API endpoint.',
					code: 'UNKNOWN_API_ENDPOINT',
					id: '2ca3b769-540a-4f08-9dd5-b5a825b6d0f1',
					kind: 'client',
				},
			});
		});

		return hono;
	}
}
