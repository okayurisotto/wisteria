/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RegistrationTicketsRepository } from '@/models/_.js';
import { InviteCodeEntityService } from '@/core/entities/InviteCodeEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { InviteCodeSchema } from '@/models/zod/invite-code.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:invite-codes',

	res: InviteCodeSchema.array(),
} as const;

export const paramDef = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	offset: z.number().int().default(0),
	type: z.enum(['unused', 'used', 'expired', 'all']).default('all'),
	sort: z.enum(['+createdAt', '-createdAt', '+usedAt', '-usedAt']).optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly inviteCodeEntityService: InviteCodeEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.registrationTicketsRepository.createQueryBuilder('ticket')
				.leftJoinAndSelect('ticket.createdBy', 'createdBy')
				.leftJoinAndSelect('ticket.usedBy', 'usedBy');

			switch (ps.type) {
				case 'unused': query.andWhere('ticket.usedBy IS NULL'); break;
				case 'used': query.andWhere('ticket.usedBy IS NOT NULL'); break;
				case 'expired': query.andWhere('ticket.expiresAt < :now', { now: new Date() }); break;
			}

			switch (ps.sort) {
				case '+createdAt': query.orderBy('ticket.id', 'DESC'); break;
				case '-createdAt': query.orderBy('ticket.id', 'ASC'); break;
				case '+usedAt': query.orderBy('ticket.usedAt', 'DESC', 'NULLS LAST'); break;
				case '-usedAt': query.orderBy('ticket.usedAt', 'ASC', 'NULLS FIRST'); break;
				default: query.orderBy('ticket.id', 'DESC'); break;
			}

			query.limit(ps.limit);
			query.offset(ps.offset);

			const tickets = await query.getMany();

			return await this.inviteCodeEntityService.packMany(tickets, me);
		});
	}
}
