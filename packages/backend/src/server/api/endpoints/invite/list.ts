/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RegistrationTicketsRepository } from '@/models/_.js';
import { InviteCodeEntityService } from '@/core/entities/InviteCodeEntityService.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { InviteCodeSchema } from '@/models/zod/invite-code.js';

export const meta = {
	tags: ['meta'],

	requireCredential: true,
	requireRolePolicy: 'canInvite',
	kind: 'read:invite-codes',

	res: InviteCodeSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly inviteCodeEntityService: InviteCodeEntityService,
		private readonly queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.registrationTicketsRepository.createQueryBuilder('ticket'), ps.sinceId, ps.untilId)
				.andWhere('ticket.createdById = :meId', { meId: me.id })
				.leftJoinAndSelect('ticket.createdBy', 'createdBy')
				.leftJoinAndSelect('ticket.usedBy', 'usedBy');

			const tickets = await query
				.limit(ps.limit)
				.getMany();

			return await this.inviteCodeEntityService.packMany(tickets, me);
		});
	}
}
