/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import type { FlashsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { z } from 'zod';
import { FlashSchema } from '@/models/zod/flash.js';

export const meta = {
	tags: ['flash'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:flash',

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	errors: {
	},

	res: FlashSchema,
} as const;

export const paramDef = z.object({
	title: z.string(),
	summary: z.string(),
	script: z.string(),
	permissions: z.string().array(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.flashsRepository)
		private readonly flashsRepository: FlashsRepository,

		private readonly flashEntityService: FlashEntityService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const flash = await this.flashsRepository.insert({
				id: this.idService.gen(),
				userId: me.id,
				updatedAt: new Date(),
				title: ps.title,
				summary: ps.summary,
				script: ps.script,
				permissions: ps.permissions,
			}).then(x => this.flashsRepository.findOneByOrFail(x.identifiers[0]));

			return await this.flashEntityService.pack(flash);
		});
	}
}
