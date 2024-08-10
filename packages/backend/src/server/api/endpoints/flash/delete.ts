/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { FlashsRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['flashs'],

	requireCredential: true,

	kind: 'write:flash',

	errors: {
		noSuchFlash: {
			message: 'No such flash.',
			code: 'NO_SUCH_FLASH',
			id: 'de1623ef-bbb3-4289-a71e-14cfa83d9740',
		},

		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '1036ad7b-9f92-4fff-89c3-0e50dc941704',
		},
	},
} as const;

export const paramDef = z.object({
	flashId: IdSchema,
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

			await this.flashsRepository.delete(flash.id);
		});
	}
}
