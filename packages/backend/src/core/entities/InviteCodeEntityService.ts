/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { RegistrationTicketsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiRegistrationTicket } from '@/models/RegistrationTicket.js';
import { IdService } from '@/core/IdService.js';
import type { z } from 'zod';
import type { InviteCodeSchema } from '@/models/zod/invite-code.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

@Injectable()
export class InviteCodeEntityService {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiRegistrationTicket['id'] | MiRegistrationTicket,
	): Promise<z.infer<typeof InviteCodeSchema>> {
		const target = typeof src === 'object'
			? src
			: await this.registrationTicketsRepository.findOneOrFail({
				where: {
					id: src,
				},
				relations: ['createdBy', 'usedBy'],
			});

		return await awaitAll({
			id: target.id,
			code: target.code,
			expiresAt: target.expiresAt ? target.expiresAt.toISOString() : null,
			createdAt: this.idService.parse(target.id).date.toISOString(),
			createdBy: target.createdBy ? await this.userLiteEntityService.packLite(target.createdBy) : null,
			usedBy: target.usedBy ? await this.userLiteEntityService.packLite(target.usedBy) : null,
			usedAt: target.usedAt ? target.usedAt.toISOString() : null,
			used: !!target.usedAt,
		});
	}

	public packMany(
		targets: (MiRegistrationTicket['id'] | MiRegistrationTicket)[],
	) {
		return Promise.all(targets.map(x => this.pack(x)));
	}
}
