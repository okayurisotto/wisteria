/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import { getIpHash } from '@/misc/get-ip-hash.js';
import type { MiLocalUser } from '@/models/User.js';
import type { MiAccessToken } from '@/models/AccessToken.js';
import { createTemp } from '@/misc/create-temp.js';
import { ApiError } from './error.js';
import { RateLimiterService } from './RateLimiterService.js';
import { ApiLoggerService } from './ApiLoggerService.js';
import { AuthenticateService } from './AuthenticateService.js';
import { AuthenticationError } from '@/misc/AuthenticationError.js';
import type { Endpoint } from './endpoints.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { IpAddressLoggingService } from './IpAddressLoggingService.js';
import { LiteResponse } from '@/misc/LiteResponse.js';
import type { ExecMethodType } from './AbstractEndpoint.js';
import { Stream } from 'node:stream';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { getConnInfo } from '@hono/node-server/conninfo';
import { z } from 'zod';

const accessDenied = new ApiError({
	message: 'Access denied.',
	code: 'ACCESS_DENIED',
	id: '56f35758-7dd5-468b-8439-5d6fb8ec9b8e',
});

type Result<T, U> = { ok: true; value: T } | { ok: false; error: U };

type CallInfo = {
	endpoint: Endpoint & { exec: ExecMethodType };
	user: MiLocalUser | null;
	token: MiAccessToken | null;
	data: unknown;
	file: { name: string; path: string } | null;
	method: string;
	ip: string;
	headers: Record<string, string>;
};

@Injectable()
export class ApiCallService {
	public constructor(
		private readonly authenticateService: AuthenticateService,
		private readonly rateLimiterService: RateLimiterService,
		private readonly roleUserService: RoleUserService,
		private readonly apiLoggerService: ApiLoggerService,
		private readonly ipAddressLoggingService: IpAddressLoggingService,
	) {}

	public async handleRequest(
		endpoint: Endpoint & { exec: ExecMethodType },
		c: Context,
	): Promise<LiteResponse> {
		let body: Record<string, unknown>;
		let file: { name: string; path: string } | null;

		switch (c.req.method) {
			case 'GET': {
				body = c.req.query();
				file = null;
				break;
			}
			case 'POST': {
				if (endpoint.meta.requireFile) {
					const data = await c.req.parseBody();
					body = data;

					const file_ = Object.values(data).find(v => v instanceof File) ?? null;
					if (file_ === null) return LiteResponse.empty(400);

					const [path] = await createTemp();
					await file_.stream().pipeTo(Stream.Writable.toWeb(fs.createWriteStream(path)));

					file = {
						name: file_.name,
						path,
					};
				} else {
					if (c.req.header('Content-Type') === 'application/json') {
						const json = z.record(z.string(), z.unknown()).safeParse(await c.req.json());
						if (!json.success) return LiteResponse.empty(400);
						body = json.data;
						file = null;
					} else {
						return LiteResponse.empty(400);
					}
				}
				break;
			}
			default: {
				return LiteResponse.empty(400);
			}
		}

		const token = getCookie(c, 'token');
		const remoteAddress = getConnInfo(c).remote.address;

		try {
			const [user, app] = await this.authenticateService.authenticate(token);

			if (user !== null && remoteAddress !== undefined) {
				await this.ipAddressLoggingService.log(remoteAddress, user);
			}

			const result = await this.call({
				endpoint,
				user,
				token: app,
				data: body,
				file,
				method: c.req.method,
				ip: remoteAddress, // TODO
				headers: c.req.header(),
			});

			if (result.ok) {
				if (c.req.method === 'GET' && endpoint.meta.cacheSec && token == null && user == null) {
					const headers = new Map([
						['Cache-Control', `public, max-age=${endpoint.meta.cacheSec.toString()}`],
					]);
					if (result.value == null) {
						return LiteResponse.empty(204, headers);
					} else {
						return LiteResponse.from(200, result.value, headers);
					}
				} else {
					if (result.value == null) {
						return LiteResponse.empty(204);
					} else {
						return LiteResponse.from(200, result.value);
					}
				}
			} else {
				return result.error.serialize();
			}
		} catch (err: unknown) {
			if (err instanceof AuthenticationError) {
				return err.serialize();
			} else {
				return new ApiError().serialize();
			}
		}
	}

	private async call({
		endpoint,
		user,
		token,
		data,
		file,
		method,
		ip,
		headers,
	}: CallInfo): Promise<Result<unknown, ApiError | AuthenticationError>> {
		// #region secure

		const isSecure = user != null && token == null;

		if (endpoint.meta.secure && !isSecure) {
			return { ok: false, error: accessDenied };
		}

		// #endregion

		// #region limit

		if (endpoint.meta.limit) {
			// koa will automatically load the `X-Forwarded-For` header if `proxy: true` is configured in the app.
			let limitActor: string;
			if (user) {
				limitActor = user.id;
			} else {
				limitActor = getIpHash(ip);
			}

			const limit = {
				...endpoint.meta.limit,
				key: endpoint.meta.limit.key ?? endpoint.name,
			};

			// TODO: 毎リクエスト計算するのもあれだしキャッシュしたい
			const factor = user ? (await this.roleUserService.getUserPolicies(user.id)).rateLimitFactor : 1;

			if (factor > 0) {
				// Rate limit
				try {
					await this.rateLimiterService.limit(limit, limitActor, factor);
				} catch {
					return {
						ok: false,
						error: new ApiError({
							message: 'Rate limit exceeded. Please try again later.',
							code: 'RATE_LIMIT_EXCEEDED',
							id: 'd5826d14-3982-4d2e-8011-b9e9f02499ef',
							httpStatusCode: 429,
						}),
					};
				}
			}
		}

		// #endregion

		// #region requireCredential / requireModerator / requireAdmin

		if (endpoint.meta.requireCredential || endpoint.meta.requireModerator || endpoint.meta.requireAdmin) {
			if (user == null) {
				return {
					ok: false,
					error: new ApiError({
						message: 'Credential required.',
						code: 'CREDENTIAL_REQUIRED',
						id: '1384574d-a912-4b81-8601-c7b1c4085df1',
						httpStatusCode: 401,
					}),
				};
			} else if (user.isSuspended) {
				return {
					ok: false,
					error: new ApiError({
						message: 'Your account has been suspended.',
						code: 'YOUR_ACCOUNT_SUSPENDED',
						kind: 'permission',
						id: 'a8c724b3-6e9c-4b46-b1a8-bc3ed6258370',
					}),
				};
			}
		}

		// #endregion

		// #region prohibitMoved

		if (endpoint.meta.prohibitMoved) {
			if (user?.movedToUri) {
				return {
					ok: false,
					error: new ApiError({
						message: 'You have moved your account.',
						code: 'YOUR_ACCOUNT_MOVED',
						kind: 'permission',
						id: '56f20ec9-fd06-4fa5-841b-edd6d7d4fa31',
					}),
				};
			}
		}

		// #endregion

		// #region requireModerator / requireAdmin

		if ((endpoint.meta.requireModerator || endpoint.meta.requireAdmin) && user !== null && !user.isRoot) {
			const myRoles = await this.roleUserService.getUserRoles(user.id);
			if (endpoint.meta.requireModerator && !myRoles.some(r => r.isModerator || r.isAdministrator)) {
				return {
					ok: false,
					error: new ApiError({
						message: 'You are not assigned to a moderator role.',
						code: 'ROLE_PERMISSION_DENIED',
						kind: 'permission',
						id: 'd33d5333-db36-423d-a8f9-1a2b9549da41',
					}),
				};
			}
			if (endpoint.meta.requireAdmin && !myRoles.some(r => r.isAdministrator)) {
				return {
					ok: false,
					error: new ApiError({
						message: 'You are not assigned to an administrator role.',
						code: 'ROLE_PERMISSION_DENIED',
						kind: 'permission',
						id: 'c3d38592-54c0-429d-be96-5636b0431a61',
					}),
				};
			}
		}

		// #endregion

		// #region requireRolePolicy

		if (endpoint.meta.requireRolePolicy != null && user !== null && !user.isRoot) {
			const myRoles = await this.roleUserService.getUserRoles(user.id);
			const policies = await this.roleUserService.getUserPolicies(user.id);
			if (!policies[endpoint.meta.requireRolePolicy] && !myRoles.some(r => r.isAdministrator)) {
				return {
					ok: false,
					error: new ApiError({
						message: 'You are not assigned to a required role.',
						code: 'ROLE_PERMISSION_DENIED',
						kind: 'permission',
						id: '7f86f06f-7e15-4057-8561-f4b6d4ac755a',
					}),
				};
			}
		}

		// #endregion

		// #region

		if (token && ((endpoint.meta.kind && !token.permission.some(p => p === endpoint.meta.kind)) ||
			(!endpoint.meta.kind && (endpoint.meta.requireCredential || endpoint.meta.requireModerator || endpoint.meta.requireAdmin)))) {
			return {
				ok: false,
				error: new ApiError({
					message: 'Your app does not have the necessary permissions to use this endpoint.',
					code: 'PERMISSION_DENIED',
					kind: 'permission',
					id: '1370e5b7-d4eb-4566-bb1d-7748ee6a1838',
				}),
			};
		}

		// #endregion

		// API invoking
		try {
			const value: unknown = await endpoint.exec(data, user, token, file ?? undefined, ip, headers);
			return { ok: true, value };
		} catch (err: unknown) {
			if (err instanceof ApiError) return { ok: false, error: err };
			if (err instanceof AuthenticationError) return { ok: false, error: err };

			if (err instanceof Error) {
				const errId = randomUUID();
				this.apiLoggerService.logger.error(`Internal error occurred in ${endpoint.name}: ${err.message}`, {
					ep: endpoint.name,
					ps: data,
					e: {
						message: err.message,
						code: err.name,
						stack: err.stack,
						id: errId,
					},
				});
				console.error(err, errId);
				return {
					ok: false,
					error: new ApiError(
						null,
						{
							e: {
								message: err.message,
								code: err.name,
								id: errId,
							},
						},
					),
				};
			} else {
				const errId = randomUUID();
				this.apiLoggerService.logger.error(`Internal error occurred in ${endpoint.name}`, {
					ep: endpoint.name,
					ps: data,
					err,
					errId,
				});
				console.error(err, errId);
				return {
					ok: false,
					error: new ApiError(null, { err, errId }),
				};
			}
		}
	}
}
