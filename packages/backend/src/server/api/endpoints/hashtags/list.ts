/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { HashtagsRepository } from '@/models/_.js';
import { HashtagEntityService } from '@/core/entities/HashtagEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { HashtagSchema } from '@/models/zod/hashtag.js';

export const meta = {
	tags: ['hashtags'],

	requireCredential: false,

	res: HashtagSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	attachedToUserOnly: z.boolean().default(false),
	attachedToLocalUserOnly: z.boolean().default(false),
	attachedToRemoteUserOnly: z.boolean().default(false),
	sort: z.enum(['+mentionedUsers', '-mentionedUsers', '+mentionedLocalUsers', '-mentionedLocalUsers', '+mentionedRemoteUsers', '-mentionedRemoteUsers', '+attachedUsers', '-attachedUsers', '+attachedLocalUsers', '-attachedLocalUsers', '+attachedRemoteUsers', '-attachedRemoteUsers']),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.hashtagsRepository)
		private readonly hashtagsRepository: HashtagsRepository,

		private readonly hashtagEntityService: HashtagEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.hashtagsRepository.createQueryBuilder('tag');

			if (ps.attachedToUserOnly) query.andWhere('tag.attachedUsersCount != 0');
			if (ps.attachedToLocalUserOnly) query.andWhere('tag.attachedLocalUsersCount != 0');
			if (ps.attachedToRemoteUserOnly) query.andWhere('tag.attachedRemoteUsersCount != 0');

			switch (ps.sort) {
				case '+mentionedUsers': query.orderBy('tag.mentionedUsersCount', 'DESC'); break;
				case '-mentionedUsers': query.orderBy('tag.mentionedUsersCount', 'ASC'); break;
				case '+mentionedLocalUsers': query.orderBy('tag.mentionedLocalUsersCount', 'DESC'); break;
				case '-mentionedLocalUsers': query.orderBy('tag.mentionedLocalUsersCount', 'ASC'); break;
				case '+mentionedRemoteUsers': query.orderBy('tag.mentionedRemoteUsersCount', 'DESC'); break;
				case '-mentionedRemoteUsers': query.orderBy('tag.mentionedRemoteUsersCount', 'ASC'); break;
				case '+attachedUsers': query.orderBy('tag.attachedUsersCount', 'DESC'); break;
				case '-attachedUsers': query.orderBy('tag.attachedUsersCount', 'ASC'); break;
				case '+attachedLocalUsers': query.orderBy('tag.attachedLocalUsersCount', 'DESC'); break;
				case '-attachedLocalUsers': query.orderBy('tag.attachedLocalUsersCount', 'ASC'); break;
				case '+attachedRemoteUsers': query.orderBy('tag.attachedRemoteUsersCount', 'DESC'); break;
				case '-attachedRemoteUsers': query.orderBy('tag.attachedRemoteUsersCount', 'ASC'); break;
			}

			query.select([
				'tag.name',
				'tag.mentionedUsersCount',
				'tag.mentionedLocalUsersCount',
				'tag.mentionedRemoteUsersCount',
				'tag.attachedUsersCount',
				'tag.attachedLocalUsersCount',
				'tag.attachedRemoteUsersCount',
			]);

			const tags = await query.limit(ps.limit).getMany();

			return this.hashtagEntityService.packMany(tags);
		});
	}
}
