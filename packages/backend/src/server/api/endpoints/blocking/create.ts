/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UsersRepository, BlockingsRepository } from '@/models/_.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { UserBlockingBlockService } from '@/core/UserBlockingBlockService.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['account'],

	limit: {
		duration: ms('1hour'),
		max: 20,
	},

	requireCredential: true,

	kind: 'write:blocks',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '7cc4f851-e2f1-4621-9633-ec9e1d00c01e',
		},

		blockeeIsYourself: {
			message: 'Blockee is yourself.',
			code: 'BLOCKEE_IS_YOURSELF',
			id: '88b19138-f28d-42c0-8499-6a31bbd0fdc6',
		},

		alreadyBlocking: {
			message: 'You are already blocking that user.',
			code: 'ALREADY_BLOCKING',
			id: '787fed64-acb9-464a-82eb-afbd745b9614',
		},
	},

	res: UserDetailedNotMeSchema,
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly getterService: GetterService,
		private readonly userBlockingBlockService: UserBlockingBlockService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const blocker = await this.usersRepository.findOneByOrFail({ id: me.id });

			// 自分自身
			if (me.id === ps.userId) {
				throw new ApiError(meta.errors.blockeeIsYourself);
			}

			// Get blockee
			const blockee = await this.getterService.getUser(ps.userId).catch((err: unknown) => {
				if (err.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
				throw err;
			});

			// Check if already blocking
			const exist = await this.blockingsRepository.exists({
				where: {
					blockerId: blocker.id,
					blockeeId: blockee.id,
				},
			});

			if (exist) {
				throw new ApiError(meta.errors.alreadyBlocking);
			}

			await this.userBlockingBlockService.block(blocker, blockee);

			return await this.userEntityService.pack(blockee.id, blocker, {
				schema: 'UserDetailedNotMe',
			});
		});
	}
}
