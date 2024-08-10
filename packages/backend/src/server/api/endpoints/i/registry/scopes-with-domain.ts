/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { RegistryApiService } from '@/core/RegistryApiService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	secure: true,

	res: z.object({
		scopes: z.string().array().array().optional(),
		domain: z.string().nullable().optional(),
	}).array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly registryApiService: RegistryApiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.registryApiService.getAllScopeAndDomains(me.id);
		});
	}
}
