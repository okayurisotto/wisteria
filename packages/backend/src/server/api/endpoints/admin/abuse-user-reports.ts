/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AbuseUserReportsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { AbuseUserReportEntityService } from '@/core/entities/AbuseUserReportEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:abuse-user-reports',

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		comment: z.string().optional(),
		resolved: z.boolean().optional(),
		reporterId: IdSchema.optional(),
		targetUserId: IdSchema.optional(),
		assigneeId: IdSchema.nullable().optional(),
		reporter: UserDetailedNotMeSchema.optional(),
		targetUser: UserDetailedNotMeSchema.optional(),
		assignee: UserDetailedNotMeSchema.nullable().optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	state: z.string().nullable().default(null),
	reporterOrigin: z.enum(['combined', 'local', 'remote']).default('combined'),
	targetUserOrigin: z.enum(['combined', 'local', 'remote']).default('combined'),
	forwarded: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.abuseUserReportsRepository)
		private readonly abuseUserReportsRepository: AbuseUserReportsRepository,

		private readonly abuseUserReportEntityService: AbuseUserReportEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps) => {
			const query = this.queryService.makePaginationQuery(this.abuseUserReportsRepository.createQueryBuilder('report'), ps.sinceId, ps.untilId);

			switch (ps.state) {
				case 'resolved': query.andWhere('report.resolved = TRUE'); break;
				case 'unresolved': query.andWhere('report.resolved = FALSE'); break;
			}

			switch (ps.reporterOrigin) {
				case 'local': query.andWhere('report.reporterHost IS NULL'); break;
				case 'remote': query.andWhere('report.reporterHost IS NOT NULL'); break;
			}

			switch (ps.targetUserOrigin) {
				case 'local': query.andWhere('report.targetUserHost IS NULL'); break;
				case 'remote': query.andWhere('report.targetUserHost IS NOT NULL'); break;
			}

			const reports = await query.limit(ps.limit).getMany();

			return await this.abuseUserReportEntityService.packMany(reports);
		});
	}
}
