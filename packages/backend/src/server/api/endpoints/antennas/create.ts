/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { IdService } from '@/core/IdService.js';
import type { UserListsRepository, AntennasRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { AntennaEntityService } from '@/core/entities/AntennaEntityService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
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
		noSuchUserList: {
			message: 'No such user list.',
			code: 'NO_SUCH_USER_LIST',
			id: '95063e93-a283-4b8b-9aa5-bcdb8df69a7f',
		},

		tooManyAntennas: {
			message: 'You cannot create antenna any more.',
			code: 'TOO_MANY_ANTENNAS',
			id: 'faf47050-e8b5-438c-913c-db2b1576fde4',
		},
	},

	res: AntennaSchema,
} as const;

export const paramDef = z.object({
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
		private readonly roleUserService: RoleUserService,
		private readonly idService: IdService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.keywords.flat().every(x => x === '') && ps.excludeKeywords.flat().every(x => x === '')) {
				throw new Error('either keywords or excludeKeywords is required.');
			}

			const currentAntennasCount = await this.antennasRepository.countBy({
				userId: me.id,
			});
			if (currentAntennasCount > (await this.roleUserService.getUserPolicies(me.id)).antennaLimit) {
				throw new ApiError(meta.errors.tooManyAntennas);
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

			const now = new Date();

			const antenna = await this.antennasRepository.insert({
				id: this.idService.gen(now.getTime()),
				lastUsedAt: now,
				userId: me.id,
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
			}).then(x => this.antennasRepository.findOneByOrFail(x.identifiers[0]));

			this.globalEventService.publishInternalEvent('antennaCreated', antenna);

			return await this.antennaEntityService.pack(antenna);
		});
	}
}
