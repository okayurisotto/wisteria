/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { IsNull } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type {
	SigninsRepository,
	UserProfilesRepository,
	UsersRepository,
} from '@/models/_.js';
import type { Config } from '@/config.js';
import { getIpHash } from '@/misc/get-ip-hash.js';
import type { MiLocalUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { WebAuthnService } from '@/core/WebAuthnService.js';
import { UserAuthService } from '@/core/UserAuthService.js';
import { RateLimiterService } from './RateLimiterService.js';
import { SigninService } from './SigninService.js';
import type { Context } from 'hono';
import { z } from 'zod';
import { getConnInfo } from '@hono/node-server/conninfo';

@Injectable()
export class SigninApiService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.signinsRepository)
		private signinsRepository: SigninsRepository,

		private idService: IdService,
		private rateLimiterService: RateLimiterService,
		private signinService: SigninService,
		private userAuthService: UserAuthService,
		private webAuthnService: WebAuthnService,
	) {}

	public async signin(c: Context): Promise<Response> {
		c.header('Access-Control-Allow-Origin', this.config.url);
		c.header('Access-Control-Allow-Credentials', 'true');

		const body = z.object({
			username: z.string(),
			password: z.string(),
			token: z.string().nullish(),
			credential: z.unknown(),
		}).safeParse(await c.req.json()).data;
		if (body === undefined) return c.body(null, 400);

		const remoteAddress = getConnInfo(c).remote.address;

		if (remoteAddress !== undefined) {
			try {
				// not more than 1 attempt per second and not more than 10 attempts per hour
				await this.rateLimiterService.limit(
					{ key: 'signin', duration: 60 * 60 * 1000, max: 10, minInterval: 1000 },
					getIpHash(remoteAddress),
				);
			} catch {
				return c.json({
					error: {
						message: 'Too many failed attempts to sign in. Try again later.',
						code: 'TOO_MANY_AUTHENTICATION_FAILURES',
						id: '22d05606-fbcf-421a-a2db-b32610dcfd1b',
					},
				}, 429);
			}
		}

		// Fetch user
		const user = await this.usersRepository.findOneBy({
			usernameLower: body.username.toLowerCase(),
			host: IsNull(),
		}) as MiLocalUser | null;

		if (user === null) {
			return c.json({ error: { id: '6cc579cc-885d-43d8-95c2-b8c7fc963280' } }, 404);
		}

		if (user.isSuspended) {
			return c.json({ error: { id: 'e03a5f46-d309-4865-9b69-56282d94e1eb' } }, 403);
		}

		const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

		// Compare password
		const same = await bcrypt.compare(body.password, profile.password!);

		const fail = async (status?: number, failure?: { id: string }) => {
			// Append signin history
			await this.signinsRepository.insert({
				id: this.idService.gen(),
				userId: user.id,
				ip: remoteAddress,
				headers: c.req.header(),
				success: false,
			});

			return c.json({ error: failure ?? { id: '4e30e80c-e338-45a0-8c8f-44455efa3b76' } }, status ?? 500);
		};

		if (!profile.twoFactorEnabled) {
			if (same) {
				return this.signinService.signin(c, user);
			} else {
				return await fail(403, {
					id: '932c904e-9460-45b7-9ce6-7ed33be7eb2c',
				});
			}
		}

		if (body.token) {
			if (!same) {
				return await fail(403, {
					id: '932c904e-9460-45b7-9ce6-7ed33be7eb2c',
				});
			}

			try {
				await this.userAuthService.twoFactorAuthenticate(profile, body.token);
			} catch (e) {
				return await fail(403, {
					id: 'cdf1235b-ac71-46d4-a3a6-84ccce48df6f',
				});
			}

			return this.signinService.signin(c, user);
		} else if (body.credential) {
			if (!same && !profile.usePasswordLessLogin) {
				return await fail(403, {
					id: '932c904e-9460-45b7-9ce6-7ed33be7eb2c',
				});
			}

			const authorized = await this.webAuthnService.verifyAuthentication(user.id, body.credential);

			if (authorized) {
				return this.signinService.signin(c, user);
			} else {
				return await fail(403, {
					id: '93b86c4b-72f9-40eb-9815-798928603d1e',
				});
			}
		} else {
			if (!same && !profile.usePasswordLessLogin) {
				return await fail(403, {
					id: '932c904e-9460-45b7-9ce6-7ed33be7eb2c',
				});
			}

			const authRequest = await this.webAuthnService.initiateAuthentication(user.id);
			return c.json(authRequest, 200);
		}

		// never get here
	}
}
