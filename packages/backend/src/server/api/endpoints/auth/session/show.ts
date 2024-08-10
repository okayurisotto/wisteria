/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AuthSessionsRepository } from '@/models/_.js';
import { AuthSessionEntityService } from '@/core/entities/AuthSessionEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { AppSchema } from '@/models/zod/app.js';

export const meta = {
	tags: ['auth'],

	requireCredential: false,

	errors: {
		noSuchSession: {
			message: 'No such session.',
			code: 'NO_SUCH_SESSION',
			id: 'bd72c97d-eba7-4adb-a467-f171b8847250',
		},
	},

	res: z.object({
		id: IdSchema.optional(),
		app: AppSchema.optional(),
		token: z.string().optional(),
	}),
} as const;

export const paramDef = z.object({
	token: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.authSessionsRepository)
		private readonly authSessionsRepository: AuthSessionsRepository,

		private readonly authSessionEntityService: AuthSessionEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Lookup session
			const session = await this.authSessionsRepository.findOneBy({
				token: ps.token,
			});

			if (session == null) {
				throw new ApiError(meta.errors.noSuchSession);
			}

			return await this.authSessionEntityService.pack(session, me);
		});
	}
}
