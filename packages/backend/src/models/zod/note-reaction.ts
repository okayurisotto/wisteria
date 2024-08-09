/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user.js';
import { IdSchema } from './IdSchema.js';

export const NoteReactionSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		user: UserLiteSchema,
		type: z.string(),
	})
	.strict();
