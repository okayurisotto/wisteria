/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';

export const HashtagSchema = z
	.object({
		tag: z.string() /* example: "misskey" */,
		mentionedUsersCount: z.number(),
		mentionedLocalUsersCount: z.number(),
		mentionedRemoteUsersCount: z.number(),
		attachedUsersCount: z.number(),
		attachedLocalUsersCount: z.number(),
		attachedRemoteUsersCount: z.number(),
	})
	.strict();
