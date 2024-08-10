/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AppsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { unique } from '@/misc/prelude/array.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { AppSchema } from '@/models/zod/app.js';

export const meta = {
	tags: ['app'],

	requireCredential: false,

	res: AppSchema,
} as const;

export const paramDef = z.object({
	name: z.string(),
	description: z.string(),
	permission: z.string().array().refine(v => new Set(v).size === v.length),
	callbackUrl: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		private readonly appEntityService: AppEntityService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Generate secret
			const secret = secureRndstr(32);

			// for backward compatibility
			const permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')));

			// Create account
			const app = await this.appsRepository.insert({
				id: this.idService.gen(),
				userId: me ? me.id : null,
				name: ps.name,
				description: ps.description,
				permission,
				callbackUrl: ps.callbackUrl,
				secret: secret,
			}).then(x => this.appsRepository.findOneByOrFail(x.identifiers[0]));

			return await this.appEntityService.pack(app, null, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
