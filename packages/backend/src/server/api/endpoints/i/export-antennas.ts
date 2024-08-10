/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueueService } from '@/core/QueueService.js';
import { z } from 'zod';

export const meta = {
	secure: true,
	requireCredential: true,
	limit: {
		duration: ms('1hour'),
		max: 1,
	},
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly queueService: QueueService,
	) {
		super(meta, paramDef, async (ps, me) => {
			this.queueService.createExportAntennasJob(me);
		});
	}
}
