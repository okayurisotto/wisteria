/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository, UserProfilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:reset-password',

	res: z.object({
		password: z.string().min(8).max(8).optional(),
	}),
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({ id: ps.userId });

			if (user == null) {
				throw new Error('user not found');
			}

			if (user.isRoot) {
				throw new Error('cannot reset password of root');
			}

			const passwd = secureRndstr(8);

			// Generate hash of password
			const hash = bcrypt.hashSync(passwd);

			await this.userProfilesRepository.update({
				userId: user.id,
			}, {
				password: hash,
			});

			this.moderationLogService.log(me, 'resetPassword', {
				userId: user.id,
				userUsername: user.username,
				userHost: user.host,
			});

			return {
				password: passwd,
			};
		});
	}
}
