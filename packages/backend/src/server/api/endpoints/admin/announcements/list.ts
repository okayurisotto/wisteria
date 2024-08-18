/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { AnnouncementsRepository, AnnouncementReadsRepository } from '@/models/_.js';
import type { MiAnnouncement } from '@/models/Announcement.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:announcements',

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		updatedAt: z.string().nullable()/* format: date-time */.optional(),
		text: z.string().optional(),
		title: z.string().optional(),
		imageUrl: z.string().nullable().optional(),
		reads: z.number().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	userId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.announcementsRepository)
		private readonly announcementsRepository: AnnouncementsRepository,

		@Inject(DI.announcementReadsRepository)
		private readonly announcementReadsRepository: AnnouncementReadsRepository,

		private readonly queryService: QueryService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps) => {
			const query = this.queryService.makePaginationQuery(this.announcementsRepository.createQueryBuilder('announcement'), ps.sinceId, ps.untilId);
			query.andWhere('announcement.isActive = true');
			if (ps.userId) {
				query.andWhere('announcement.userId = :userId', { userId: ps.userId });
			} else {
				query.andWhere('announcement.userId IS NULL');
			}

			const announcements = await query.limit(ps.limit).getMany();

			const reads = new Map<MiAnnouncement, number>();

			for (const announcement of announcements) {
				reads.set(announcement, await this.announcementReadsRepository.countBy({
					announcementId: announcement.id,
				}));
			}

			return announcements.map(announcement => ({
				id: announcement.id,
				createdAt: this.idService.parse(announcement.id).date.toISOString(),
				updatedAt: announcement.updatedAt?.toISOString() ?? null,
				title: announcement.title,
				text: announcement.text,
				imageUrl: announcement.imageUrl,
				icon: announcement.icon,
				display: announcement.display,
				isActive: announcement.isActive,
				forExistingUsers: announcement.forExistingUsers,
				silence: announcement.silence,
				needConfirmationToRead: announcement.needConfirmationToRead,
				userId: announcement.userId,
				reads: reads.get(announcement)!,
			}));
		});
	}
}
