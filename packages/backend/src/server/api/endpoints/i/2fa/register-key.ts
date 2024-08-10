/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { WebAuthnService } from '@/core/WebAuthnService.js';
import { ApiError } from '@/server/api/error.js';
import { UserAuthService } from '@/core/UserAuthService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	secure: true,

	errors: {
		userNotFound: {
			message: 'User not found.',
			code: 'USER_NOT_FOUND',
			id: '652f899f-66d4-490e-993e-6606c8ec04c3',
		},

		incorrectPassword: {
			message: 'Incorrect password.',
			code: 'INCORRECT_PASSWORD',
			id: '38769596-efe2-4faf-9bec-abbb3f2cd9ba',
		},

		twoFactorNotEnabled: {
			message: '2fa not enabled.',
			code: 'TWO_FACTOR_NOT_ENABLED',
			id: 'bf32b864-449b-47b8-974e-f9a5468546f1',
		},
	},

	res: z.object({
		rp: z.object({
			id: z.string().optional(),
		}),
		user: z.object({
			id: z.string().optional(),
			name: z.string().optional(),
			displayName: z.string().optional(),
		}),
		challenge: z.string().optional(),
		pubKeyCredParams: z.object({
			type: z.string().optional(),
			alg: z.number().optional(),
		}).array(),
		timeout: z.number().nullable().optional(),
		excludeCredentials: z.object({
			id: z.string().optional(),
			type: z.string().optional(),
			transports: z.enum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']).array().optional(),
		}).array().nullable(),
		authenticatorSelection: z.object({
			authenticatorAttachment: z.enum(['cross-platform', 'platform']).optional(),
			requireResidentKey: z.boolean().optional(),
			userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
		}).nullable(),
		attestation: z.enum(['direct', 'enterprise', 'indirect', 'none']).nullable().optional(),
		extensions: z.object({
			appid: z.string().nullable().optional(),
			credProps: z.boolean().nullable().optional(),
			hmacCreateSecret: z.boolean().nullable().optional(),
		}).nullable(),
	}),
} as const;

export const paramDef = z.object({
	password: z.string(),
	token: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly webAuthnService: WebAuthnService,
		private readonly userAuthService: UserAuthService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const token = ps.token;
			const profile = await this.userProfilesRepository.findOne({
				where: {
					userId: me.id,
				},
				relations: ['user'],
			});

			if (profile == null) {
				throw new ApiError(meta.errors.userNotFound);
			}

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

			if (!profile.twoFactorEnabled) {
				throw new ApiError(meta.errors.twoFactorNotEnabled);
			}

			return await this.webAuthnService.initiateRegistration(
				me.id,
				profile.user?.username ?? me.id,
				profile.user?.name ?? undefined,
			);
		});
	}
}
