/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:user-note',
} as const;

export const paramDef = z.object({
	userId: IdSchema,
	text: z.string(),
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

			const currentProfile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			await this.userProfilesRepository.update({ userId: user.id }, {
				moderationNote: ps.text,
			});

			this.moderationLogService.log(me, 'updateUserNote', {
				userId: user.id,
				userUsername: user.username,
				userHost: user.host,
				before: currentProfile.moderationNote,
				after: ps.text,
			});
		});
	}
}
