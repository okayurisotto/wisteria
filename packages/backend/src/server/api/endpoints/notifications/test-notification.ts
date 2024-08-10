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
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly notificationCreateService: NotificationCreateService,
	) {
		super(meta, paramDef, async (ps, user) => {
			this.notificationCreateService.createNotification(user.id, 'test', {});
		});
	}
}
