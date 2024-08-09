/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const AntennaSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		name: z.string(),
		keywords: z.string().array().array(),
		excludeKeywords: z.string().array().array(),
		src: z.enum(['home', 'all', 'users', 'list', 'users_blacklist']),
		userListId: IdSchema.nullable(),
		users: z.string().array(),
		caseSensitive: z.boolean().default(false),
		localOnly: z.boolean().default(false),
		notify: z.boolean(),
		withReplies: z.boolean().default(false),
		withFile: z.boolean(),
		isActive: z.boolean(),
		hasUnreadNote: z.boolean().default(false),
	})
	.strict();
