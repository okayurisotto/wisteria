/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as OTPAuth from 'otpauth';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	secure: true,

	res: z.object({
		backupCodes: z.string().array().optional(),
	}),
} as const;

export const paramDef = z.object({
	token: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const token = ps.token.replace(/\s/g, '');

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: me.id });

			if (profile.twoFactorTempSecret == null) {
				throw new Error('二段階認証の設定が開始されていません');
			}

			const delta = OTPAuth.TOTP.validate({
				secret: OTPAuth.Secret.fromBase32(profile.twoFactorTempSecret),
				digits: 6,
				token,
				window: 5,
			});

			if (delta === null) {
				throw new Error('not verified');
			}

			const backupCodes = Array.from({ length: 5 }, () => new OTPAuth.Secret().base32);

			await this.userProfilesRepository.update(me.id, {
				twoFactorSecret: profile.twoFactorTempSecret,
				twoFactorBackupSecret: backupCodes,
				twoFactorEnabled: true,
			});

			// Publish meUpdated event
			this.globalEventService.publishMainStream(me.id, 'meUpdated', null);

			return {
				backupCodes: backupCodes,
			};
		});
	}
}
