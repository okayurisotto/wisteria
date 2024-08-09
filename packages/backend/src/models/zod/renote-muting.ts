/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserDetailedNotMeSchema } from './user.js';
import { IdSchema } from './IdSchema.js';

export const RenoteMutingSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		muteeId: IdSchema,
		mutee: UserDetailedNotMeSchema,
	})
	.strict();
