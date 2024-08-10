/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AnnouncementsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { AnnouncementService } from '@/core/AnnouncementService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:announcements',

	errors: {
		noSuchAnnouncement: {
			message: 'No such announcement.',
			code: 'NO_SUCH_ANNOUNCEMENT',
			id: 'ecad8040-a276-4e85-bda9-015a708d291e',
		},
	},
} as const;

export const paramDef = z.object({
	id: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.announcementsRepository)
		private readonly announcementsRepository: AnnouncementsRepository,

		private readonly announcementService: AnnouncementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const announcement = await this.announcementsRepository.findOneBy({ id: ps.id });

			if (announcement == null) throw new ApiError(meta.errors.noSuchAnnouncement);

			await this.announcementService.delete(announcement, me);
		});
	}
}
