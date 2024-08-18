/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AppsRepository, AuthSessionsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';

export const meta = {
	tags: ['auth'],

	requireCredential: false,

	res: z.object({
		token: z.string().optional(),
		url: z.string()/* format: url */.optional(),
	}),

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: '92f93e63-428e-4f2f-a5a4-39e1407fe998',
		},
	},
} as const;

export const paramDef = z.object({
	appSecret: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		@Inject(DI.authSessionsRepository)
		private readonly authSessionsRepository: AuthSessionsRepository,

		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps) => {
			// Lookup app
			const app = await this.appsRepository.findOneBy({
				secret: ps.appSecret,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			// Generate token
			const token = randomUUID();

			// Create session token document
			const doc = await this.authSessionsRepository.insert({
				id: this.idService.gen(),
				appId: app.id,
				token: token,
			}).then(x => this.authSessionsRepository.findOneByOrFail(x.identifiers[0]));

			return {
				token: doc.token,
				url: `${this.config.authUrl}/${doc.token}`,
			};
		});
	}
}
