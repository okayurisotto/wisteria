/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { HashtagsRepository } from '@/models/_.js';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import { HashtagEntityService } from '@/core/entities/HashtagEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { HashtagSchema } from '@/models/zod/hashtag.js';

export const meta = {
	tags: ['hashtags'],

	requireCredential: false,

	res: HashtagSchema,

	errors: {
		noSuchHashtag: {
			message: 'No such hashtag.',
			code: 'NO_SUCH_HASHTAG',
			id: '110ee688-193e-4a3a-9ecf-c167b2e6981e',
		},
	},
} as const;

export const paramDef = z.object({
	tag: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hashtagsRepository)
		private readonly hashtagsRepository: HashtagsRepository,

		private readonly hashtagEntityService: HashtagEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const hashtag = await this.hashtagsRepository.findOneBy({ name: normalizeForSearch(ps.tag) });
			if (hashtag == null) {
				throw new ApiError(meta.errors.noSuchHashtag);
			}

			return await this.hashtagEntityService.pack(hashtag);
		});
	}
}
