/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import type { FlashsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['flash'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:flash',

	limit: {
		duration: ms('1hour'),
		max: 300,
	},

	errors: {
		noSuchFlash: {
			message: 'No such flash.',
			code: 'NO_SUCH_FLASH',
			id: '611e13d2-309e-419a-a5e4-e0422da39b02',
		},

		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '08e60c88-5948-478e-a132-02ec701d67b2',
		},
	},
} as const;

export const paramDef = z.object({
	flashId: IdSchema,
	title: z.string(),
	summary: z.string(),
	script: z.string(),
	permissions: z.string().array(),
	visibility: z.enum(['public', 'private']).optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.flashsRepository)
		private readonly flashsRepository: FlashsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const flash = await this.flashsRepository.findOneBy({ id: ps.flashId });
			if (flash == null) {
				throw new ApiError(meta.errors.noSuchFlash);
			}
			if (flash.userId !== me.id) {
				throw new ApiError(meta.errors.accessDenied);
			}

			await this.flashsRepository.update(flash.id, {
				updatedAt: new Date(),
				title: ps.title,
				summary: ps.summary,
				script: ps.script,
				permissions: ps.permissions,
				visibility: ps.visibility,
			});
		});
	}
}
