/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as stream from 'node:stream/promises';
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
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IEndpointMeta, IEndpoint } from './endpoints.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { IpAddressLoggingService } from './IpAddressLoggingService.js';
import { LiteResponse } from '@/misc/LiteResponse.js';

const accessDenied = new ApiError({
	message: 'Access denied.',
	code: 'ACCESS_DENIED',
	id: '56f35758-7dd5-468b-8439-5d6fb8ec9b8e',
});

type Result<T, U> = { ok: true; value: T } | { ok: false; error: U };

type CallInfo = {
	endpoint: IEndpoint & { exec: unknown };
	user: MiLocalUser | null;
	token: MiAccessToken | null;
	data: unknown;
	file: { name: string; path: string } | null;
	method: string;
	ip: string;
	headers: Record<string, string | string[] | undefined>;
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
		endpoint: IEndpoint & { exec: any },
		request: FastifyRequest<{ Body: Record<string, unknown> | undefined, Querystring: Record<string, unknown> }>,
		reply: FastifyReply,
	): Promise<void> {
		const body = request.method === 'GET'
			? request.query
			: request.body;

		// https://datatracker.ietf.org/doc/html/rfc6750.html#section-2.1 (case sensitive)
		const token = request.headers.authorization?.startsWith('Bearer ')
			? request.headers.authorization.slice(7)
			: body?.['i'];
		if (token != null && typeof token !== 'string') {
			reply.code(400);
			return;
		}

		try {
			const [user, app] = await this.authenticateService.authenticate(token);

			try {
				const result = await this.call({
					endpoint,
					user,
					token: app,
					data: body,
					file: null,
					method: request.method,
					ip: request.ip,
					headers: request.headers,
				});

				if (result.ok) {
					if (request.method === 'GET' && endpoint.meta.cacheSec && !token && !user) {
						reply.header('Cache-Control', `public, max-age=${endpoint.meta.cacheSec}`);
					}

					this.sendData(result.value).reply(reply);
				} else {
					throw result.error;
				}
			} catch (err: unknown) {
				if (err instanceof ApiError) {
					err.serialize().reply(reply);
				} else {
					throw err;
				}
			}

			if (user) {
				await this.ipAddressLoggingService.log(request.ip, user);
			}
		} catch (err: unknown) {
			if (err instanceof AuthenticationError) {
				err.serialize().reply(reply);
			} else {
				new ApiError().serialize().reply(reply);
			}
		}
	}

	public async handleMultipartRequest(
		endpoint: IEndpoint & { exec: any },
		request: FastifyRequest<{ Body: Record<string, unknown>, Querystring: Record<string, unknown> }>,
		reply: FastifyReply,
	): Promise<void> {
		const multipartData = await request.file()
			.then((data) => data ?? null)
			.catch(() => {
				// Fastify throws if the remote didn't send multipart data. Return 400 below.
				return null;
			});

		if (multipartData === null) {
			reply.code(400);
			reply.send();
			return;
		}

		const [path] = await createTemp();
		await stream.pipeline(multipartData.file, fs.createWriteStream(path));

		const fields: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(multipartData.fields)) {
			fields[k] = typeof v === 'object' && 'value' in v ? v.value : undefined;
		}

		// https://datatracker.ietf.org/doc/html/rfc6750.html#section-2.1 (case sensitive)
		const token = request.headers.authorization?.startsWith('Bearer ')
			? request.headers.authorization.slice(7)
			: fields['i'];
		if (token != null && typeof token !== 'string') {
			reply.code(400);
			return;
		}

		try {
			const [user, app] = await this.authenticateService.authenticate(token);

			try {
				const result = await this.call({
					endpoint,
					user,
					token: app,
					data: fields,
					file: { name: multipartData.filename, path: path },
					method: request.method,
					ip: request.ip,
					headers: request.headers,
				});

				if (result.ok) {
					this.sendData(result.value).reply(reply);
				} else {
					throw result.error;
				}
			} catch (err: unknown) {
				if (err instanceof ApiError) {
					err.serialize().reply(reply);
				} else {
					throw err;
				}
			}

			if (user) {
				await this.ipAddressLoggingService.log(request.ip, user);
			}
		} catch (err: unknown) {
			if (err instanceof AuthenticationError) {
				err.serialize().reply(reply);
			} else {
				new ApiError().serialize().reply(reply);
			}
		}
	}

	private sendData(data: unknown): LiteResponse<NonNullable<unknown>> {
		if (data == null) {
			return LiteResponse.empty(204);
		} else {
			return LiteResponse.from(200, data);
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
		//#region secure

		const isSecure = user != null && token == null;

		if (endpoint.meta.secure && !isSecure) {
			return { ok: false, error: accessDenied };
		}

		//#endregion

		//#region limit

		if (endpoint.meta.limit) {
			// koa will automatically load the `X-Forwarded-For` header if `proxy: true` is configured in the app.
			let limitActor: string;
			if (user) {
				limitActor = user.id;
			} else {
				limitActor = getIpHash(ip);
			}

			const limit = Object.assign({}, endpoint.meta.limit);

			if (limit.key == null) {
				(limit as any).key = endpoint.name;
			}

			// TODO: 毎リクエスト計算するのもあれだしキャッシュしたい
			const factor = user ? (await this.roleUserService.getUserPolicies(user.id)).rateLimitFactor : 1;

			if (factor > 0) {
				// Rate limit
				try {
					await this.rateLimiterService.limit(limit as IEndpointMeta['limit'] & { key: NonNullable<string> }, limitActor, factor);
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

		//#endregion

		//#region requireCredential / requireModerator / requireAdmin

		if (endpoint.meta.requireCredential || endpoint.meta.requireModerator || endpoint.meta.requireAdmin) {
			if (user == null) {
				return {
					ok: false,
					error: new ApiError({
						message: 'Credential required.',
						code: 'CREDENTIAL_REQUIRED',
						id: '1384574d-a912-4b81-8601-c7b1c4085df1',
						httpStatusCode: 401,
					})
				};
			} else if (user.isSuspended) {
				return {
					ok: false,
					error: new ApiError({
						message: 'Your account has been suspended.',
						code: 'YOUR_ACCOUNT_SUSPENDED',
						kind: 'permission',
						id: 'a8c724b3-6e9c-4b46-b1a8-bc3ed6258370',
					})
				};
			}
		}

		//#endregion

		//#region prohibitMoved

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

		//#endregion

		//#region requireModerator / requireAdmin

		if ((endpoint.meta.requireModerator || endpoint.meta.requireAdmin) && !user!.isRoot) {
			const myRoles = await this.roleUserService.getUserRoles(user!.id);
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

		//#endregion

		//#region requireRolePolicy

		if (endpoint.meta.requireRolePolicy != null && !user!.isRoot) {
			const myRoles = await this.roleUserService.getUserRoles(user!.id);
			const policies = await this.roleUserService.getUserPolicies(user!.id);
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

		//#endregion

		//#region

		if (token && ((endpoint.meta.kind && !token.permission.some(p => p === endpoint.meta.kind))
			|| (!endpoint.meta.kind && (endpoint.meta.requireCredential || endpoint.meta.requireModerator || endpoint.meta.requireAdmin)))) {
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

		//#endregion

		//#region Cast non JSON input

		if ((endpoint.meta.requireFile || method === 'GET') && endpoint.params.properties) {
			for (const k of Object.keys(endpoint.params.properties)) {
				const param = endpoint.params.properties[k];
				if (['boolean', 'number', 'integer'].includes(param.type ?? '') && typeof data[k] === 'string') {
					try {
						data[k] = JSON.parse(data[k]);
					} catch (e) {
						return {
							ok: false,
							error: new ApiError(
								{
									message: 'Invalid param.',
									code: 'INVALID_PARAM',
									id: '0b5f1631-7c1a-41a6-b399-cce335f34d85',
								},
								{
									param: k,
									reason: `cannot cast to ${param.type}`,
								},
							),
						}
					}
				}
			}
		}

		//#endregion

		// API invoking
		try {
			const value: unknown = await endpoint.exec(data, user, token, file, ip, headers);
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
