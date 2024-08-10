/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { AchievementService, ACHIEVEMENT_TYPES } from '@/core/AchievementService.js';
import { z } from 'zod';

export const meta = {
	requireCredential: true,
	prohibitMoved: true,
	kind: 'write:account',
} as const;

export const paramDef = z.object({ name: z.enum(ACHIEVEMENT_TYPES) });

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly achievementService: AchievementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.achievementService.create(me.id, ps.name);
		});
	}
}
