/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserProfilesRepository, UserSecurityKeysRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	secure: true,

	errors: {
		noKey: {
			message: 'No security key.',
			code: 'NO_SECURITY_KEY',
			id: 'f9c54d7f-d4c2-4d3c-9a8g-a70daac86512',
		},
	},
} as const;

export const paramDef = z.object({
	value: z.boolean(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.userSecurityKeysRepository)
		private readonly userSecurityKeysRepository: UserSecurityKeysRepository,

		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.value) {
				// セキュリティキーがなければパスワードレスを有効にはできない
				const keyCount = await this.userSecurityKeysRepository.count({
					where: {
						userId: me.id,
					},
					select: {
						id: true,
						name: true,
						lastUsed: true,
					},
				});

				if (keyCount === 0) {
					await this.userProfilesRepository.update(me.id, {
						usePasswordLessLogin: false,
					});

					throw new ApiError(meta.errors.noKey);
				}
			}

			await this.userProfilesRepository.update(me.id, {
				usePasswordLessLogin: ps.value,
			});

			// Publish meUpdated event
			this.globalEventService.publishMainStream(me.id, 'meUpdated', null);
		});
	}
}
