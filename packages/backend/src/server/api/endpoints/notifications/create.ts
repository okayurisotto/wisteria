/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NotificationCreateService } from '@/core/NotificationCreateService.js';
import { z } from 'zod';

export const meta = {
	tags: ['notifications'],

	requireCredential: true,

	kind: 'write:notifications',

	limit: {
		duration: 1000 * 60,
		max: 10,
	},

	errors: {
	},
} as const;

export const paramDef = z.object({
	body: z.string(),
	header: z.string().nullable().optional(),
	icon: z.string().nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly notificationCreateService: NotificationCreateService,
	) {
		super(meta, paramDef, async (ps, user, token) => {
			this.notificationCreateService.createNotification(user.id, 'app', {
				appAccessTokenId: token ? token.id : null,
				customBody: ps.body,
				customHeader: ps.header ?? token?.name ?? null,
				customIcon: ps.icon ?? token?.iconUrl ?? null,
			});
		});
	}
}
