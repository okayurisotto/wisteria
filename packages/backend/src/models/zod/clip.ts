/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user.js';
import { IdSchema } from './IdSchema.js';

export const ClipSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		lastClippedAt: z.string().nullable() /* format: date-time */,
		userId: IdSchema,
		user: UserLiteSchema,
		name: z.string(),
		description: z.string().nullable(),
		isPublic: z.boolean(),
		favoritedCount: z.number(),
		isFavorited: z.boolean().optional(),
	})
	.strict();
