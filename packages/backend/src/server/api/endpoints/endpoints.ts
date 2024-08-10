/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { endpoints } from '../endpoints.js';
import { z } from 'zod';

export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: z.string().array()/* example: ["admin/abuse-user-reports","admin/accounts/create","admin/announcements/create","..."] */,
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
	) {
		super(meta, paramDef, async () => {
			return endpoints.map(x => x.name);
		});
	}
}
