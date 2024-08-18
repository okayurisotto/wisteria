/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { EmailService } from '@/core/EmailService.js';
import { z } from 'zod';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: z.object({
		available: z.boolean().optional(),
		reason: z.string().nullable().optional(),
	}),
} as const;

export const paramDef = z.object({
	emailAddress: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly emailService: EmailService,
	) {
		super(meta, paramDef, async (ps) => {
			return await this.emailService.validateEmailForAccount(ps.emailAddress);
		});
	}
}
