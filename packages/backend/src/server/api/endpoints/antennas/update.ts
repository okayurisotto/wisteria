/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AntennasRepository, UserListsRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { AntennaEntityService } from '@/core/entities/AntennaEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { AntennaSchema } from '@/models/zod/antenna.js';

export const meta = {
	tags: ['antennas'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:account',

	errors: {
		noSuchAntenna: {
			message: 'No such antenna.',
			code: 'NO_SUCH_ANTENNA',
			id: '10c673ac-8852-48eb-aa1f-f5b67f069290',
		},

		noSuchUserList: {
			message: 'No such user list.',
			code: 'NO_SUCH_USER_LIST',
			id: '1c6b35c9-943e-48c2-81e4-2844989407f7',
		},
	},

	res: AntennaSchema,
} as const;

export const paramDef = z.object({
	antennaId: IdSchema,
	name: z.string().min(1).max(100),
	src: z.enum(['home', 'all', 'users', 'list', 'users_blacklist']),
	userListId: IdSchema.nullable().optional(),
	keywords: z.string().array().array(),
	excludeKeywords: z.string().array().array(),
	users: z.string().array(),
	caseSensitive: z.boolean(),
	localOnly: z.boolean().optional(),
	withReplies: z.boolean(),
	withFile: z.boolean(),
	notify: z.boolean(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.antennasRepository)
		private readonly antennasRepository: AntennasRepository,

		@Inject(DI.userListsRepository)
		private readonly userListsRepository: UserListsRepository,

		private readonly antennaEntityService: AntennaEntityService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.keywords.flat().every(x => x === '') && ps.excludeKeywords.flat().every(x => x === '')) {
				throw new Error('either keywords or excludeKeywords is required.');
			}
			// Fetch the antenna
			const antenna = await this.antennasRepository.findOneBy({
				id: ps.antennaId,
				userId: me.id,
			});

			if (antenna == null) {
				throw new ApiError(meta.errors.noSuchAntenna);
			}

			let userList;

			if (ps.src === 'list' && ps.userListId) {
				userList = await this.userListsRepository.findOneBy({
					id: ps.userListId,
					userId: me.id,
				});

				if (userList == null) {
					throw new ApiError(meta.errors.noSuchUserList);
				}
			}

			await this.antennasRepository.update(antenna.id, {
				name: ps.name,
				src: ps.src,
				userListId: userList ? userList.id : null,
				keywords: ps.keywords,
				excludeKeywords: ps.excludeKeywords,
				users: ps.users,
				caseSensitive: ps.caseSensitive,
				localOnly: ps.localOnly,
				withReplies: ps.withReplies,
				withFile: ps.withFile,
				notify: ps.notify,
				isActive: true,
				lastUsedAt: new Date(),
			});

			this.globalEventService.publishInternalEvent('antennaUpdated', await this.antennasRepository.findOneByOrFail({ id: antenna.id }));

			return await this.antennaEntityService.pack(antenna.id);
		});
	}
}
