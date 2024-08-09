/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';

export const AppSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		callbackUrl: z.string().nullable(),
		permission: z.string().array(),
		secret: z.string().optional(),
		isAuthorized: z.boolean().optional(),
	})
	.strict();
