/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const AdSchema = z
	.object({
		id: IdSchema,
		expiresAt: z.string() /* format: date-time */,
		startsAt: z.string() /* format: date-time */,
		place: z.string(),
		priority: z.string(),
		ratio: z.number(),
		url: z.string(),
		imageUrl: z.string(),
		memo: z.string(),
		dayOfWeek: z.number().int(),
	})
	.strict();
