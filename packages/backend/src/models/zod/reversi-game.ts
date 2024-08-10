/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user-lite.js';
import { IdSchema } from './IdSchema.js';

export const ReversiGameLiteSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		startedAt: z.string().nullable() /* format: date-time */,
		endedAt: z.string().nullable() /* format: date-time */,
		isStarted: z.boolean(),
		isEnded: z.boolean(),
		user1Id: IdSchema,
		user2Id: IdSchema,
		user1: UserLiteSchema,
		user2: UserLiteSchema,
		winnerId: IdSchema.nullable(),
		winner: UserLiteSchema.nullable(),
		surrenderedUserId: IdSchema.nullable(),
		timeoutUserId: IdSchema.nullable(),
		black: z.number().nullable(),
		bw: z.string(),
		noIrregularRules: z.boolean(),
		isLlotheo: z.boolean(),
		canPutEverywhere: z.boolean(),
		loopedBoard: z.boolean(),
		timeLimitForEachTurn: z.number(),
	})
	.strict();

export const ReversiGameDetailedSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		startedAt: z.string().nullable() /* format: date-time */,
		endedAt: z.string().nullable() /* format: date-time */,
		isStarted: z.boolean(),
		isEnded: z.boolean(),
		form1: z.record(z.string(), z.unknown()).nullable(),
		form2: z.record(z.string(), z.unknown()).nullable(),
		user1Ready: z.boolean(),
		user2Ready: z.boolean(),
		user1Id: IdSchema,
		user2Id: IdSchema,
		user1: UserLiteSchema,
		user2: UserLiteSchema,
		winnerId: IdSchema.nullable(),
		winner: UserLiteSchema.nullable(),
		surrenderedUserId: IdSchema.nullable(),
		timeoutUserId: IdSchema.nullable(),
		black: z.number().nullable(),
		bw: z.string(),
		noIrregularRules: z.boolean(),
		isLlotheo: z.boolean(),
		canPutEverywhere: z.boolean(),
		loopedBoard: z.boolean(),
		timeLimitForEachTurn: z.number(),
		logs: z.number().array().array(),
		map: z.string().array(),
	})
	.strict();
