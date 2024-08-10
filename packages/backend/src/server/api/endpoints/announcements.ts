/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { AnnouncementService } from '@/core/AnnouncementService.js';
import { DI } from '@/di-symbols.js';
import type { AnnouncementsRepository } from '@/models/_.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { AnnouncementSchema } from '@/models/zod/announcement.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,

	res: AnnouncementSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	isActive: z.boolean().default(true),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.announcementsRepository)
		private readonly announcementsRepository: AnnouncementsRepository,

		private readonly queryService: QueryService,
		private readonly announcementService: AnnouncementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.announcementsRepository.createQueryBuilder('announcement'), ps.sinceId, ps.untilId)
				.andWhere('announcement.isActive = :isActive', { isActive: ps.isActive })
				.andWhere(new Brackets((qb) => {
					if (me) qb.orWhere('announcement.userId = :meId', { meId: me.id });
					qb.orWhere('announcement.userId IS NULL');
				}));

			const announcements = await query.limit(ps.limit).getMany();

			return this.announcementService.packMany(announcements, me);
		});
	}
}
