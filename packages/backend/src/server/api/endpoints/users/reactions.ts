/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserProfilesRepository, NoteReactionsRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteReactionEntityService } from '@/core/entities/NoteReactionEntityService.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { ApiError } from '../../error.js';
import { isRemoteUser } from '@/misc/isRemoteUser.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteReactionSchema } from '@/models/zod/note-reaction.js';

export const meta = {
	tags: ['users', 'reactions'],

	requireCredential: false,

	description: 'Show all reactions this user made.',

	res: NoteReactionSchema.array(),

	errors: {
		reactionsNotPublic: {
			message: 'Reactions of the user is not public.',
			code: 'REACTIONS_NOT_PUBLIC',
			id: '673a7dd2-6924-1093-e0c0-e68456ceae5c',
		},
		isRemoteUser: {
			message: 'Currently unavailable to display reactions of remote users. See https://github.com/misskey-dev/misskey/issues/12964',
			code: 'IS_REMOTE_USER',
			id: '6b95fa98-8cf9-2350-e284-f0ffdb54a805',
		},
	},
} as const;

export const paramDef = z.object({
	userId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		private readonly noteReactionEntityService: NoteReactionEntityService,
		private readonly queryService: QueryService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const iAmModerator = me ? await this.roleUserService.isModerator(me) : false; // Moderators can see reactions of all users
			if (!iAmModerator) {
				const user = await this.usersRepository.findOneByOrFail({ id: ps.userId });
				if (isRemoteUser(user)) {
					throw new ApiError(meta.errors.isRemoteUser);
				}

				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: ps.userId });
				if ((me == null || me.id !== ps.userId) && !profile.publicReactions) {
					throw new ApiError(meta.errors.reactionsNotPublic);
				}
			}

			const query = this.queryService.makePaginationQuery(this.noteReactionsRepository.createQueryBuilder('reaction'),
				ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)
				.andWhere('reaction.userId = :userId', { userId: ps.userId })
				.leftJoinAndSelect('reaction.note', 'note');

			this.queryService.generateVisibilityQuery(query, me);

			const reactions = await query
				.limit(ps.limit)
				.getMany();

			return await Promise.all(reactions.map(reaction => this.noteReactionEntityService.pack(reaction, me, { withNote: true })));
		});
	}
}
