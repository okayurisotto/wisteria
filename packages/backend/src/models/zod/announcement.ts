/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const AnnouncementSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		updatedAt: z.string().nullable() /* format: date-time */,
		text: z.string(),
		title: z.string(),
		imageUrl: z.string().nullable(),
		icon: z.enum(['info', 'warning', 'error', 'success']),
		display: z.enum(['dialog', 'normal', 'banner']),
		needConfirmationToRead: z.boolean(),
		silence: z.boolean(),
		forYou: z.boolean(),
		isRead: z.boolean().optional(),
	})
	.strict();
