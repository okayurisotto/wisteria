/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { Hono } from 'hono';

const FAILED_MESSAGE =
	'Verification failed. Please try again. メールアドレスの認証に失敗しました。もう一度お試しください';
const SUCCEEDED_MESSAGE =
	'Verification succeeded! メールアドレスの認証に成功しました。';

@Injectable()
export class EmailVerificationServerService {
	public constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly globalEventService: GlobalEventService,
		private readonly userEntityService: UserEntityService,
	) {}

	public async verify(code: string): Promise<boolean> {
		const profile = await this.userProfilesRepository.findOneBy({
			emailVerifyCode: code,
		});
		if (profile === null) return false;

		await this.userProfilesRepository.update(
			{ userId: profile.userId },
			{
				emailVerified: true,
				emailVerifyCode: null,
			},
		);

		this.globalEventService.publishMainStream(
			profile.userId,
			'meUpdated',
			await this.userEntityService.pack(
				profile.userId,
				{ id: profile.userId },
				{
					schema: 'MeDetailed',
					includeSecrets: true,
				},
			),
		);

		return true;
	}

	public createServer(): Hono {
		return new Hono().get('/:code', async (c) => {
			const verified = await this.verify(c.req.param('code'));

			if (verified) {
				return c.text(SUCCEEDED_MESSAGE, 200);
			} else {
				return c.text(FAILED_MESSAGE, 404);
			}
		});
	}
}
