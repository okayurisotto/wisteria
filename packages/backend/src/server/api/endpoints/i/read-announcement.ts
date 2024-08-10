/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { AnnouncementService } from '@/core/AnnouncementService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,

	kind: 'write:account',

	errors: {
	},
} as const;

export const paramDef = z.object({
	announcementId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly announcementService: AnnouncementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.announcementService.read(me, ps.announcementId);
		});
	}
}
