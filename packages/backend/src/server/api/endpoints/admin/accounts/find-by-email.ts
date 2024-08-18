/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApiError } from '@/server/api/error.js';
import { z } from 'zod';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:account',

	errors: {
		userNotFound: {
			message: 'No such user who has the email address.',
			code: 'USER_NOT_FOUND',
			id: 'cb865949-8af5-4062-a88c-ef55e8786d1d',
		},
	},
	res: UserDetailedNotMeSchema,
} as const;

export const paramDef = z.object({
	email: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const profile = await this.userProfilesRepository.findOne({
				where: { email: ps.email },
				relations: ['user'],
			});

			if (profile == null) {
				throw new ApiError(meta.errors.userNotFound);
			}

			const res = await this.userEntityService.pack(profile.user!, null, {
				schema: 'UserDetailedNotMe',
			});

			return res;
		});
	}
}
