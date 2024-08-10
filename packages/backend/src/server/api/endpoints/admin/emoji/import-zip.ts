/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { QueueService } from '@/core/QueueService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	secure: true,
	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
} as const;

export const paramDef = z.object({
	fileId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly queueService: QueueService,
	) {
		super(meta, paramDef, async (ps, me) => {
			this.queueService.createImportCustomEmojisJob(me, ps.fileId);
		});
	}
}
