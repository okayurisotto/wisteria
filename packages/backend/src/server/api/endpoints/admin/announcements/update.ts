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
			id: 'd3aae5a7-6372-4cb4-b61c-f511ffc2d7cc',
		},
	},
} as const;

export const paramDef = z.object({
	id: IdSchema,
	title: z.string().min(1).optional(),
	text: z.string().min(1).optional(),
	imageUrl: z.string().min(0).nullable().optional(),
	icon: z.enum(['info', 'warning', 'error', 'success']).optional(),
	display: z.enum(['normal', 'banner', 'dialog']).optional(),
	forExistingUsers: z.boolean().optional(),
	silence: z.boolean().optional(),
	needConfirmationToRead: z.boolean().optional(),
	isActive: z.boolean().optional(),
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

			await this.announcementService.update(announcement, {
				updatedAt: new Date(),
				title: ps.title,
				text: ps.text,
				imageUrl: ps.imageUrl || null,
				display: ps.display,
				icon: ps.icon,
				forExistingUsers: ps.forExistingUsers,
				silence: ps.silence,
				needConfirmationToRead: ps.needConfirmationToRead,
				isActive: ps.isActive,
			}, me);
		});
	}
}
