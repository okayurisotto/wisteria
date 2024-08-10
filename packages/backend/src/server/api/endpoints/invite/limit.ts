/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RegistrationTicketsRepository } from '@/models/_.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { z } from 'zod';

export const meta = {
	tags: ['meta'],

	requireCredential: true,
	requireRolePolicy: 'canInvite',
	kind: 'read:invite-codes',

	res: z.object({
		remaining: z.number().int().nullable().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly roleUserService: RoleUserService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const policies = await this.roleUserService.getUserPolicies(me.id);

			const count = policies.inviteLimit
				? await this.registrationTicketsRepository.countBy({
					id: MoreThan(this.idService.gen(Date.now() - (policies.inviteExpirationTime * 60 * 1000))),
					createdById: me.id,
				})
				: null;

			return {
				remaining: count !== null ? Math.max(0, policies.inviteLimit - count) : null,
			};
		});
	}
}
