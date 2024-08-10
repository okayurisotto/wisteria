/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NotificationService } from '@/core/NotificationService.js';
import { z } from 'zod';

export const meta = {
	tags: ['notifications', 'account'],

	requireCredential: true,

	kind: 'write:notifications',
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly notificationService: NotificationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			this.notificationService.readAllNotification(me.id, true);
		});
	}
}
