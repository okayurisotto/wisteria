/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsedUsernamesRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';
import { z } from 'zod';
import { LocalUsernameSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: z.object({
		available: z.boolean().optional(),
	}),
} as const;

export const paramDef = z.object({
	username: LocalUsernameSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.usedUsernamesRepository)
		private readonly usedUsernamesRepository: UsedUsernamesRepository,

		private readonly metaService: MetaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const exist = await this.usersRepository.countBy({
				host: IsNull(),
				usernameLower: ps.username.toLowerCase(),
			});

			const exist2 = await this.usedUsernamesRepository.countBy({ username: ps.username.toLowerCase() });

			const meta = await this.metaService.fetch();
			const isPreserved = meta.preservedUsernames.map(x => x.toLowerCase()).includes(ps.username.toLowerCase());

			return {
				available: exist === 0 && exist2 === 0 && !isPreserved,
			};
		});
	}
}
