/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { MoreThan } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { RegistrationTicketsRepository } from '@/models/_.js';
import { InviteCodeEntityService } from '@/core/entities/InviteCodeEntityService.js';
import { IdService } from '@/core/IdService.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { DI } from '@/di-symbols.js';
import { generateInviteCode } from '@/misc/generate-invite-code.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { InviteCodeSchema } from '@/models/zod/invite-code.js';

export const meta = {
	tags: ['meta'],

	requireCredential: true,
	requireRolePolicy: 'canInvite',
	kind: 'write:invite-codes',

	errors: {
		exceededCreateLimit: {
			message: 'You have exceeded the limit for creating an invitation code.',
			code: 'EXCEEDED_LIMIT_OF_CREATE_INVITE_CODE',
			id: '8b165dd3-6f37-4557-8db1-73175d63c641',
		},
	},

	res: InviteCodeSchema,
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly inviteCodeEntityService: InviteCodeEntityService,
		private readonly idService: IdService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (_ps, me) => {
			const policies = await this.roleUserService.getUserPolicies(me.id);

			if (policies.inviteLimit) {
				const count = await this.registrationTicketsRepository.countBy({
					id: MoreThan(this.idService.gen(Date.now() - (policies.inviteLimitCycle * 1000 * 60))),
					createdById: me.id,
				});

				if (count >= policies.inviteLimit) {
					throw new ApiError(meta.errors.exceededCreateLimit);
				}
			}

			const ticket = await this.registrationTicketsRepository.insert({
				id: this.idService.gen(),
				createdBy: me,
				createdById: me.id,
				expiresAt: policies.inviteExpirationTime ? new Date(Date.now() + (policies.inviteExpirationTime * 1000 * 60)) : null,
				code: generateInviteCode(),
			}).then(x => this.registrationTicketsRepository.findOneByOrFail(x.identifiers[0]));

			return await this.inviteCodeEntityService.pack(ticket);
		});
	}
}
