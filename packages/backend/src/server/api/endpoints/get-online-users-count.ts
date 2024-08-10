/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { MoreThan } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { USER_ONLINE_THRESHOLD } from '@/const.js';
import type { UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 1,
	res: z.object({
		count: z.number().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,
	) {
		super(meta, paramDef, async () => {
			const count = await this.usersRepository.countBy({
				lastActiveDate: MoreThan(new Date(Date.now() - USER_ONLINE_THRESHOLD)),
			});

			return {
				count,
			};
		});
	}
}
