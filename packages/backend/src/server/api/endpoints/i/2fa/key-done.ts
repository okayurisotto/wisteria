/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import type { UserProfilesRepository, UserSecurityKeysRepository } from '@/models/_.js';
import { WebAuthnService } from '@/core/WebAuthnService.js';
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
			id: '0d7ec6d2-e652-443e-a7bf-9ee9a0cd77b0',
		},

		twoFactorNotEnabled: {
			message: '2fa not enabled.',
			code: 'TWO_FACTOR_NOT_ENABLED',
			id: '798d6847-b1ed-4f9c-b1f9-163c42655995',
		},
	},

	res: z.object({
		id: z.string().optional(),
		name: z.string().optional(),
	}),
} as const;

export const paramDef = z.object({
	password: z.string(),
	token: z.string().nullable().optional(),
	name: z.string().min(1).max(30),
	credential: z.record(z.string(), z.unknown()),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.userSecurityKeysRepository)
		private readonly userSecurityKeysRepository: UserSecurityKeysRepository,

		private readonly webAuthnService: WebAuthnService,
		private readonly userAuthService: UserAuthService,
		private readonly userEntityService: UserEntityService,
		private readonly globalEventService: GlobalEventService,
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

			if (!profile.twoFactorEnabled) {
				throw new ApiError(meta.errors.twoFactorNotEnabled);
			}

			const keyInfo = await this.webAuthnService.verifyRegistration(me.id, ps.credential);

			const credentialId = Buffer.from(keyInfo.credentialID).toString('base64url');
			await this.userSecurityKeysRepository.insert({
				id: credentialId,
				userId: me.id,
				name: ps.name,
				publicKey: Buffer.from(keyInfo.credentialPublicKey).toString('base64url'),
				counter: keyInfo.counter,
				credentialDeviceType: keyInfo.credentialDeviceType,
				credentialBackedUp: keyInfo.credentialBackedUp,
				transports: keyInfo.transports,
			});

			// Publish meUpdated event
			this.globalEventService.publishMainStream(me.id, 'meUpdated', await this.userEntityService.pack(me.id, me, {
				schema: 'MeDetailed',
				includeSecrets: true,
			}));

			return {
				id: credentialId,
				name: ps.name,
			};
		});
	}
}
