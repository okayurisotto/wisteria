/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { z } from 'zod';

export const meta = {
	tags: ['drive', 'account'],

	requireCredential: true,

	kind: 'read:drive',

	res: z.object({
		capacity: z.number().optional(),
		usage: z.number().optional(),
	}),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (_ps, me) => {
			// Calculate drive usage
			const usage = await this.driveFileEntityService.calcDriveUsageOf(me.id);

			const policies = await this.roleUserService.getUserPolicies(me.id);

			return {
				capacity: 1024 * 1024 * policies.driveCapacityMb,
				usage: usage,
			};
		});
	}
}
