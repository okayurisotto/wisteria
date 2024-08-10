/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { InstancesRepository } from '@/models/_.js';
import { InstanceEntityService } from '@/core/entities/InstanceEntityService.js';
import { MetaService } from '@/core/MetaService.js';
import { DI } from '@/di-symbols.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { z } from 'zod';
import { FederationInstanceSchema } from '@/models/zod/federation-instance.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 3600,

	res: FederationInstanceSchema.array(),
} as const;

export const paramDef = z.object({
	host: z.string().nullable().describe('Omit or use `null` to not filter by host.').optional(),
	blocked: z.coerce.boolean().nullable().optional(),
	notResponding: z.coerce.boolean().nullable().optional(),
	suspended: z.coerce.boolean().nullable().optional(),
	silenced: z.coerce.boolean().nullable().optional(),
	federating: z.coerce.boolean().nullable().optional(),
	subscribing: z.coerce.boolean().nullable().optional(),
	publishing: z.coerce.boolean().nullable().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(30),
	offset: z.coerce.number().int().default(0),
	sort: z.enum(['+pubSub', '-pubSub', '+notes', '-notes', '+users', '-users', '+following', '-following', '+followers', '-followers', '+firstRetrievedAt', '-firstRetrievedAt', '+latestRequestReceivedAt', '-latestRequestReceivedAt']).nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		private readonly instanceEntityService: InstanceEntityService,
		private readonly metaService: MetaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.instancesRepository.createQueryBuilder('instance');

			switch (ps.sort) {
				case '+pubSub': query.orderBy('instance.followingCount', 'DESC').orderBy('instance.followersCount', 'DESC'); break;
				case '-pubSub': query.orderBy('instance.followingCount', 'ASC').orderBy('instance.followersCount', 'ASC'); break;
				case '+notes': query.orderBy('instance.notesCount', 'DESC'); break;
				case '-notes': query.orderBy('instance.notesCount', 'ASC'); break;
				case '+users': query.orderBy('instance.usersCount', 'DESC'); break;
				case '-users': query.orderBy('instance.usersCount', 'ASC'); break;
				case '+following': query.orderBy('instance.followingCount', 'DESC'); break;
				case '-following': query.orderBy('instance.followingCount', 'ASC'); break;
				case '+followers': query.orderBy('instance.followersCount', 'DESC'); break;
				case '-followers': query.orderBy('instance.followersCount', 'ASC'); break;
				case '+firstRetrievedAt': query.orderBy('instance.firstRetrievedAt', 'DESC'); break;
				case '-firstRetrievedAt': query.orderBy('instance.firstRetrievedAt', 'ASC'); break;
				case '+latestRequestReceivedAt': query.orderBy('instance.latestRequestReceivedAt', 'DESC', 'NULLS LAST'); break;
				case '-latestRequestReceivedAt': query.orderBy('instance.latestRequestReceivedAt', 'ASC', 'NULLS FIRST'); break;

				default: query.orderBy('instance.id', 'DESC'); break;
			}

			if (typeof ps.blocked === 'boolean') {
				const meta = await this.metaService.fetch();
				if (ps.blocked) {
					query.andWhere(meta.blockedHosts.length === 0 ? '1=0' : 'instance.host IN (:...blocks)', { blocks: meta.blockedHosts });
				} else {
					query.andWhere(meta.blockedHosts.length === 0 ? '1=1' : 'instance.host NOT IN (:...blocks)', { blocks: meta.blockedHosts });
				}
			}

			if (typeof ps.notResponding === 'boolean') {
				if (ps.notResponding) {
					query.andWhere('instance.isNotResponding = TRUE');
				} else {
					query.andWhere('instance.isNotResponding = FALSE');
				}
			}

			if (typeof ps.suspended === 'boolean') {
				if (ps.suspended) {
					query.andWhere('instance.isSuspended = TRUE');
				} else {
					query.andWhere('instance.isSuspended = FALSE');
				}
			}

			if (typeof ps.silenced === 'boolean') {
				const meta = await this.metaService.fetch();

				if (ps.silenced) {
					if (meta.silencedHosts.length === 0) {
						return [];
					}
					query.andWhere('instance.host IN (:...silences)', {
						silences: meta.silencedHosts,
					});
				} else if (meta.silencedHosts.length > 0) {
					query.andWhere('instance.host NOT IN (:...silences)', {
						silences: meta.silencedHosts,
					});
				}
			}

			if (typeof ps.federating === 'boolean') {
				if (ps.federating) {
					query.andWhere('((instance.followingCount > 0) OR (instance.followersCount > 0))');
				} else {
					query.andWhere('((instance.followingCount = 0) AND (instance.followersCount = 0))');
				}
			}

			if (typeof ps.subscribing === 'boolean') {
				if (ps.subscribing) {
					query.andWhere('instance.followersCount > 0');
				} else {
					query.andWhere('instance.followersCount = 0');
				}
			}

			if (typeof ps.publishing === 'boolean') {
				if (ps.publishing) {
					query.andWhere('instance.followingCount > 0');
				} else {
					query.andWhere('instance.followingCount = 0');
				}
			}

			if (ps.host) {
				query.andWhere('instance.host like :host', { host: '%' + sqlLikeEscape(ps.host.toLowerCase()) + '%' });
			}

			const instances = await query.limit(ps.limit).offset(ps.offset).getMany();

			return await this.instanceEntityService.packMany(instances);
		});
	}
}
