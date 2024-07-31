/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository } from '@/models/_.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { MetaService } from '@/core/MetaService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { ApiError } from '../error.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'UserDetailed',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private metaService: MetaService,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const meta = await this.metaService.fetch();

			const accts = meta.pinnedUsers.map(acct => AcctEntity.parse(acct, this.config.host));
			if (accts.some(acct => acct === null)) throw new ApiError();

			const users = await Promise.all(
				accts
					.filter(acct => acct !== null)
					.map(acct => this.usersRepository.findOneBy({
						usernameLower: acct.username.toLowerCase(),
						host: acct.host ?? IsNull(),
					})),
			);

			return await this.userEntityService.packMany(users.filter(x => x !== null), me, { schema: 'UserDetailed' });
		});
	}
}
