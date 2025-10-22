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
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:announcements',

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		updatedAt: z.string().nullable()/* format: date-time */.optional(),
		title: z.string().optional(),
		text: z.string().optional(),
		imageUrl: z.string().nullable().optional(),
	}),
} as const;

export const paramDef = z.object({
	title: z.string().min(1),
	text: z.string().min(1),
	imageUrl: z.string().min(1).nullable(),
	icon: z.enum(['info', 'warning', 'error', 'success']).default('info'),
	display: z.enum(['normal', 'banner', 'dialog']).default('normal'),
	forExistingUsers: z.boolean().default(false),
	silence: z.boolean().default(false),
	needConfirmationToRead: z.boolean().default(false),
	userId: IdSchema.nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly announcementService: AnnouncementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const { packed } = await this.announcementService.create({
				updatedAt: null,
				title: ps.title,
				text: ps.text,
				imageUrl: ps.imageUrl,
				icon: ps.icon,
				display: ps.display,
				forExistingUsers: ps.forExistingUsers,
				silence: ps.silence,
				needConfirmationToRead: ps.needConfirmationToRead,
				userId: ps.userId,
			}, me);

			return packed;
		});
	}
}
