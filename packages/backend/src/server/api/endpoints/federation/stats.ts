/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull, MoreThan, Not } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { FollowingsRepository, InstancesRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { InstanceEntityService } from '@/core/entities/InstanceEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { FederationInstanceSchema } from '@/models/zod/federation-instance.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 60 * 60,

	res: z.object({
		topSubInstances: FederationInstanceSchema.array().optional(),
		otherFollowersCount: z.number().optional(),
		topPubInstances: FederationInstanceSchema.array().optional(),
		otherFollowingCount: z.number().optional(),
	}),
} as const;

export const paramDef = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly instanceEntityService: InstanceEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const [topSubInstances, topPubInstances, allSubCount, allPubCount] = await Promise.all([
				this.instancesRepository.find({
					where: {
						followersCount: MoreThan(0),
					},
					order: {
						followersCount: 'DESC',
					},
					take: ps.limit,
				}),
				this.instancesRepository.find({
					where: {
						followingCount: MoreThan(0),
					},
					order: {
						followingCount: 'DESC',
					},
					take: ps.limit,
				}),
				this.followingsRepository.count({
					where: {
						followeeHost: Not(IsNull()),
					},
				}),
				this.followingsRepository.count({
					where: {
						followerHost: Not(IsNull()),
					},
				}),
			]);

			const gotSubCount = topSubInstances.map(x => x.followersCount).reduce((a, b) => a + b, 0);
			const gotPubCount = topPubInstances.map(x => x.followingCount).reduce((a, b) => a + b, 0);

			return await awaitAll({
				topSubInstances: this.instanceEntityService.packMany(topSubInstances),
				otherFollowersCount: Math.max(0, allSubCount - gotSubCount),
				topPubInstances: this.instanceEntityService.packMany(topPubInstances),
				otherFollowingCount: Math.max(0, allPubCount - gotPubCount),
			});
		});
	}
}
