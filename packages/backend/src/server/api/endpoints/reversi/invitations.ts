/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ReversiService } from '@/core/ReversiService.js';
import { z } from 'zod';
import { UserLiteSchema } from '@/models/zod/user-lite.js';

export const meta = {
	requireCredential: true,

	kind: 'read:account',

	res: UserLiteSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly userEntityService: UserEntityService,
		private readonly reversiService: ReversiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const invitations = await this.reversiService.getInvitations(me);

			return await this.userEntityService.packMany(invitations, me);
		});
	}
}
