/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as ms from '@/misc/ms.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { IdService } from '@/core/IdService.js';
import type { RenoteMutingsRepository } from '@/models/_.js';
import type { MiRenoteMuting } from '@/models/RenoteMuting.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,
	prohibitMoved: true,

	kind: 'write:mutes',

	limit: {
		duration: ms.hours(1),
		max: 20,
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '5e0a5dff-1e94-4202-87ae-4d9c89eb2271',
		},

		muteeIsYourself: {
			message: 'Mutee is yourself.',
			code: 'MUTEE_IS_YOURSELF',
			id: '37285718-52f7-4aef-b7de-c38b8e8a8420',
		},

		alreadyMuting: {
			message: 'You are already muting that user.',
			code: 'ALREADY_MUTING',
			id: 'ccfecbe4-1f1c-4fc2-8a3d-c3ffee61cb7b',
		},
	},
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.renoteMutingsRepository)
		private readonly renoteMutingsRepository: RenoteMutingsRepository,

		private readonly getterService: GetterService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const muter = me;

			// 自分自身
			if (me.id === ps.userId) {
				throw new ApiError(meta.errors.muteeIsYourself);
			}

			// Get mutee
			const mutee = await this.getterService.getUser(ps.userId).catch((err: unknown) => {
				if (err.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
				throw err;
			});

			// Check if already muting
			const exist = await this.renoteMutingsRepository.findOneBy({
				muterId: muter.id,
				muteeId: mutee.id,
			});

			if (exist != null) {
				throw new ApiError(meta.errors.alreadyMuting);
			}

			// Create mute
			await this.renoteMutingsRepository.insert({
				id: this.idService.gen(),
				muterId: muter.id,
				muteeId: mutee.id,
			} as MiRenoteMuting);
		});
	}
}
