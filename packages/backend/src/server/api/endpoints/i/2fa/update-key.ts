/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { UserSecurityKeysRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,

	secure: true,

	errors: {
		noSuchKey: {
			message: 'No such key.',
			code: 'NO_SUCH_KEY',
			id: 'f9c5467f-d492-4d3c-9a8g-a70dacc86512',
		},

		accessDenied: {
			message: 'You do not have edit privilege of this key.',
			code: 'ACCESS_DENIED',
			id: '1fb7cb09-d46a-4fff-b8df-057708cce513',
		},
	},
} as const;

export const paramDef = z.object({
	name: z.string().min(1).max(30),
	credentialId: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.userSecurityKeysRepository)
		private readonly userSecurityKeysRepository: UserSecurityKeysRepository,

		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const key = await this.userSecurityKeysRepository.findOneBy({
				id: ps.credentialId,
			});

			if (key == null) {
				throw new ApiError(meta.errors.noSuchKey);
			}

			if (key.userId !== me.id) {
				throw new ApiError(meta.errors.accessDenied);
			}

			await this.userSecurityKeysRepository.update(key.id, {
				name: ps.name,
			});

			// Publish meUpdated event
			this.globalEventService.publishMainStream(me.id, 'meUpdated', null);

			return {};
		});
	}
}
