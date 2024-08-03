/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ReversiService } from '@/core/ReversiService.js';

export const meta = {
	requireCredential: true,

	kind: 'read:account',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: { ref: 'UserLite' },
	},
} as const;

export const paramDef = {
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private userEntityService: UserEntityService,
		private reversiService: ReversiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const invitations = await this.reversiService.getInvitations(me);

			return await this.userEntityService.packMany(invitations, me);
		});
	}
}
