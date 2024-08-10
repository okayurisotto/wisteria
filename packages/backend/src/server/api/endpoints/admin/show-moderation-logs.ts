/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { ModerationLogsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogEntityService } from '@/core/entities/ModerationLogEntityService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:show-moderation-log',

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		type: z.string().optional(),
		info: z.record(z.string(), z.unknown()).optional(),
		userId: IdSchema.optional(),
		user: UserDetailedNotMeSchema.optional(),
	}).array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	type: z.string().nullable().optional(),
	userId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.moderationLogsRepository)
		private readonly moderationLogsRepository: ModerationLogsRepository,

		private readonly moderationLogEntityService: ModerationLogEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.moderationLogsRepository.createQueryBuilder('report'), ps.sinceId, ps.untilId);

			if (ps.type != null) {
				query.andWhere('report.type = :type', { type: ps.type });
			}

			if (ps.userId != null) {
				query.andWhere('report.userId = :userId', { userId: ps.userId });
			}

			const reports = await query.limit(ps.limit).getMany();

			return await this.moderationLogEntityService.packMany(reports);
		});
	}
}
