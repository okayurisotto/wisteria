/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const UserListSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		name: z.string(),
		userIds: IdSchema.array().optional(),
		isPublic: z.boolean(),
	})
	.strict();
