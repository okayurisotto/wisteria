/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { Inject, Injectable } from '@nestjs/common';
import type { UserProfilesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { ApiError } from '@/server/api/error.js';
import { UserAuthService } from '@/core/UserAuthService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	secure: true,

	errors: {
		incorrectPassword: {
			message: 'Incorrect password.',
			code: 'INCORRECT_PASSWORD',
			id: '78d6c839-20c9-4c66-b90a-fc0542168b48',
		},
	},

	res: z.object({
		qr: z.string().optional(),
		url: z.string().optional(),
		secret: z.string().optional(),
		label: z.string().optional(),
		issuer: z.string().optional(),
	}),
} as const;

export const paramDef = z.object({
	password: z.string(),
	token: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly userAuthService: UserAuthService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const token = ps.token;
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: me.id });

			if (profile.twoFactorEnabled) {
				if (token == null) {
					throw new Error('authentication failed');
				}

				try {
					await this.userAuthService.twoFactorAuthenticate(profile, token);
				} catch (e) {
					throw new Error('authentication failed');
				}
			}

			const passwordMatched = await bcrypt.compare(ps.password, profile.password ?? '');
			if (!passwordMatched) {
				throw new ApiError(meta.errors.incorrectPassword);
			}

			// Generate user's secret key
			const secret = new OTPAuth.Secret();

			await this.userProfilesRepository.update(me.id, {
				twoFactorTempSecret: secret.base32,
			});

			// Get the data URL of the authenticator URL
			const totp = new OTPAuth.TOTP({
				secret,
				digits: 6,
				label: me.username,
				issuer: this.config.host,
			});
			const url = totp.toString();
			const qr = await QRCode.toDataURL(url);

			return {
				qr,
				url,
				secret: secret.base32,
				label: me.username,
				issuer: this.config.host,
			};
		});
	}
}
