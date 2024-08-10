/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { EmailService } from '@/core/EmailService.js';
import { z } from 'zod';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:send-email',
} as const;

export const paramDef = z.object({
	to: z.string(),
	subject: z.string(),
	text: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly emailService: EmailService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.emailService.sendEmail(ps.to, ps.subject, ps.text, ps.text);
		});
	}
}
