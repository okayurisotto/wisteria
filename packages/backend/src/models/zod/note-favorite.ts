/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { NoteSchema } from './note.js';
import { IdSchema } from './IdSchema.js';

export const NoteFavoriteSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		note: NoteSchema,
		noteId: IdSchema,
	})
	.strict();
