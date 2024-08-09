/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const FederationInstanceSchema = z
	.object({
		id: IdSchema,
		firstRetrievedAt: z.string() /* format: date-time */,
		host: z.string() /* example: "misskey.example.com" */,
		usersCount: z.number(),
		notesCount: z.number(),
		followingCount: z.number(),
		followersCount: z.number(),
		isNotResponding: z.boolean(),
		isSuspended: z.boolean(),
		isBlocked: z.boolean(),
		softwareName: z.string().nullable() /* example: "misskey" */,
		softwareVersion: z.string().nullable(),
		openRegistrations: z.boolean().nullable() /* example: true */,
		name: z.string().nullable(),
		description: z.string().nullable(),
		maintainerName: z.string().nullable(),
		maintainerEmail: z.string().nullable(),
		isSilenced: z.boolean(),
		iconUrl: z.string().nullable() /* format: url */,
		faviconUrl: z.string().nullable() /* format: url */,
		themeColor: z.string().nullable(),
		infoUpdatedAt: z.string().nullable() /* format: date-time */,
		latestRequestReceivedAt: z.string().nullable() /* format: date-time */,
	})
	.strict();
