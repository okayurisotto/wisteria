/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';

export const QueueCountSchema = z
	.object({
		waiting: z.number(),
		active: z.number(),
		completed: z.number(),
		failed: z.number(),
		delayed: z.number(),
	})
	.strict();
