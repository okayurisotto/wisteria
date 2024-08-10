/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository } from '@/models/_.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { InstanceActorService } from '@/core/InstanceActorService.js';
import { DI } from '@/di-symbols.js';
import type { Packed } from '@/misc/json-schema.js';
import { z } from 'zod';
import { LocalUsernameSchema, MeDetailedSchema, PasswordSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['admin'],

	res: MeDetailedSchema.merge(z.object({ token: z.string() })),
} as const;

export const paramDef = z.object({
	username: LocalUsernameSchema,
	password: PasswordSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
		private readonly signupService: SignupService,
		private readonly instanceActorService: InstanceActorService,
	) {
		super(meta, paramDef, async (ps, _me, token) => {
			const me = _me ? await this.usersRepository.findOneByOrFail({ id: _me.id }) : null;
			const realUsers = await this.instanceActorService.realLocalUsersPresent();
			if ((realUsers && !me?.isRoot) || token !== null) throw new Error('access denied');

			const { account, secret } = await this.signupService.signup({
				username: ps.username,
				password: ps.password,
				ignorePreservedUsernames: true,
			});

			const res = await this.userEntityService.pack(account, account, {
				schema: 'MeDetailed',
				includeSecrets: true,
			}) as Packed<'MeDetailed'> & { token: string };

			res.token = secret;

			return res;
		});
	}
}
