/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user-lite.js';
import { DriveFileSchema } from './drive-file.js';
import { IdSchema } from './IdSchema.js';

export const GalleryPostSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		updatedAt: z.string() /* format: date-time */,
		userId: IdSchema,
		user: UserLiteSchema,
		title: z.string(),
		description: z.string().nullable(),
		fileIds: IdSchema.array().optional(),
		files: DriveFileSchema.array().optional(),
		tags: z.string().array().optional(),
		isSensitive: z.boolean(),
		likedCount: z.number(),
		isLiked: z.boolean().optional(),
	})
	.strict();
