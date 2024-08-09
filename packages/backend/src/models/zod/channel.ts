/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { NoteSchema } from './note.js';
import { IdSchema } from './IdSchema.js';

export const ChannelSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		lastNotedAt: z.string().nullable() /* format: date-time */,
		name: z.string(),
		description: z.string().nullable(),
		userId: IdSchema.nullable(),
		bannerUrl: z.string().nullable() /* format: url */,
		pinnedNoteIds: IdSchema.array(),
		color: z.string(),
		isArchived: z.boolean(),
		usersCount: z.number(),
		notesCount: z.number(),
		isSensitive: z.boolean(),
		allowRenoteToExternal: z.boolean(),
		isFollowing: z.boolean().optional(),
		isFavorited: z.boolean().optional(),
		pinnedNotes: NoteSchema.array().optional(),
	})
	.strict();
