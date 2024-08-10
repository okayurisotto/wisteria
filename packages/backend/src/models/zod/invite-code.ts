/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user-lite.js';
import { IdSchema } from './IdSchema.js';

export const InviteCodeSchema = z
	.object({
		id: IdSchema,
		code: z.string() /* example: "GR6S02ERUA5VR" */,
		expiresAt: z.string().nullable() /* format: date-time */,
		createdAt: z.string() /* format: date-time */,
		createdBy: UserLiteSchema.nullable(),
		usedBy: UserLiteSchema.nullable(),
		usedAt: z.string().nullable() /* format: date-time */,
		used: z.boolean(),
	})
	.strict();
