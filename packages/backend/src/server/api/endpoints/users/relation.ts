/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['users'],

	requireCredential: true,
	kind: 'read:account',

	description: 'Show the different kinds of relations between the authenticated user and the specified user(s).',

	res: z.union([
		z.object({
			id: IdSchema.optional(),
			isFollowing: z.boolean().optional(),
			hasPendingFollowRequestFromYou: z.boolean().optional(),
			hasPendingFollowRequestToYou: z.boolean().optional(),
			isFollowed: z.boolean().optional(),
			isBlocking: z.boolean().optional(),
			isBlocked: z.boolean().optional(),
			isMuted: z.boolean().optional(),
			isRenoteMuted: z.boolean().optional(),
		}),
		z.object({
			id: IdSchema.optional(),
			isFollowing: z.boolean().optional(),
			hasPendingFollowRequestFromYou: z.boolean().optional(),
			hasPendingFollowRequestToYou: z.boolean().optional(),
			isFollowed: z.boolean().optional(),
			isBlocking: z.boolean().optional(),
			isBlocked: z.boolean().optional(),
			isMuted: z.boolean().optional(),
			isRenoteMuted: z.boolean().optional(),
		}).array(),
	]),
} as const;

export const paramDef = z.object({
	userId: z.union([
		IdSchema,
		IdSchema.array(),
	]),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const ids = Array.isArray(ps.userId) ? ps.userId : [ps.userId];

			const relations = await Promise.all(ids.map(id => this.userEntityService.getRelation(me.id, id)));

			return Array.isArray(ps.userId) ? relations : relations[0];
		});
	}
}
