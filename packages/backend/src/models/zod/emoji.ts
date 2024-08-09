/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const EmojiSimpleSchema = z
	.object({
		aliases: IdSchema.array(),
		name: z.string(),
		category: z.string().nullable(),
		url: z.string(),
		localOnly: z.boolean().optional(),
		isSensitive: z.boolean().optional(),
		roleIdsThatCanBeUsedThisEmojiAsReaction: IdSchema.array().optional(),
	})
	.strict();

export const EmojiDetailedSchema = z
	.object({
		id: IdSchema,
		aliases: IdSchema.array(),
		name: z.string(),
		category: z.string().nullable(),
		host: z
			.string()
			.nullable()
			.describe('The local host is represented with `null`.'),
		url: z.string(),
		license: z.string().nullable(),
		isSensitive: z.boolean(),
		localOnly: z.boolean(),
		roleIdsThatCanBeUsedThisEmojiAsReaction: IdSchema.array(),
	})
	.strict();
