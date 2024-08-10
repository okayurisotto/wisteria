/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { GetterService } from '@/server/api/GetterService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['federation'],

	requireCredential: false,
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly getterService: GetterService,
		private readonly apPersonService: ApPersonService,
	) {
		super(meta, paramDef, async (ps) => {
			const user = await this.getterService.getRemoteUser(ps.userId);
			await this.apPersonService.updatePerson(user.uri);
		});
	}
}
