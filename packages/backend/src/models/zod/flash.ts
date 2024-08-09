/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user.js';
import { IdSchema } from './IdSchema.js';

export const FlashSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		updatedAt: z.string() /* format: date-time */,
		userId: IdSchema,
		user: UserLiteSchema,
		title: z.string(),
		summary: z.string(),
		script: z.string(),
		likedCount: z.number().nullable(),
		isLiked: z.boolean().optional(),
	})
	.strict();
