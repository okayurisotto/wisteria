/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user.js';
import { DriveFileSchema } from './drive-file.js';
import { IdSchema } from './IdSchema.js';

const NoteSchemaBase = z.object({
	id: IdSchema,
	createdAt: z.string() /* format: date-time */,
	deletedAt: z.string().nullable().optional() /* format: date-time */,
	text: z.string().nullable(),
	cw: z.string().nullable().optional(),
	userId: IdSchema,
	user: UserLiteSchema,
	replyId: IdSchema.nullable().optional(),
	renoteId: IdSchema.nullable().optional(),
	isHidden: z.boolean().optional(),
	visibility: z.enum(['public', 'home', 'followers', 'specified']),
	mentions: IdSchema.array().optional(),
	visibleUserIds: IdSchema.array().optional(),
	fileIds: IdSchema.array().optional(),
	files: DriveFileSchema.array().optional(),
	tags: z.string().array().optional(),
	poll: z
		.object({
			expiresAt: z.string().nullable().optional() /* format: date-time */,
			multiple: z.boolean(),
			choices: z
				.object({
					isVoted: z.boolean(),
					text: z.string(),
					votes: z.number(),
				})
				.strict()
				.array(),
		})
		.strict()
		.nullable()
		.optional(),
	channelId: IdSchema.nullable().optional(),
	channel: z
		.object({
			id: z.string(),
			name: z.string(),
			color: z.string(),
			isSensitive: z.boolean(),
			allowRenoteToExternal: z.boolean(),
			userId: z.string().nullable(),
		})
		.strict()
		.nullable()
		.optional(),
	localOnly: z.boolean().optional(),
	reactionAcceptance: z.string().nullable(),
	renoteCount: z.number(),
	repliesCount: z.number(),
	uri: z.string().optional(),
	url: z.string().optional(),
	reactionAndUserPairCache: z.string().array().optional(),
	clippedCount: z.number().optional(),
	myReaction: z.string().nullable().optional(),
	emojis: z.record(z.string(), z.string()).optional(),
	reactionEmojis: z.record(z.string(), z.string()),
	reactions: z.record(z.string(), z.string()),
});

type NoteSchemaType = z.infer<typeof NoteSchemaBase> & {
	reply?: NoteSchemaType | null | undefined;
	renote?: NoteSchemaType | null | undefined;
};

export const NoteSchema: z.ZodType<NoteSchemaType> = NoteSchemaBase.extend({
	reply: z
		.lazy(() => NoteSchema)
		.nullable()
		.optional(),
	renote: z
		.lazy(() => NoteSchema)
		.nullable()
		.optional(),
}).strict();
