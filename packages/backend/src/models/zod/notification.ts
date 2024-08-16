/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { notificationTypes } from '@/types.js';
import { IdSchema } from './IdSchema.js';
import { z } from 'zod';
import { UserLiteSchema } from './user-lite.js';
import { NoteSchema } from './note.js';
import { RoleSchema } from './role.js';

const NotificationBaseSchema = z.object({
	id: IdSchema,
	createdAt: z.string()/* format: date-time */,
	type: z.enum([...notificationTypes, 'reaction:grouped', 'renote:grouped']),
});

export const NotificationSchema = z.discriminatedUnion('type', [
	NotificationBaseSchema.extend({
		type: z.literal('note'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('mention'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('reply'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('renote'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('quote'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('reaction'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
		reaction: z.string(),
	}),
	NotificationBaseSchema.extend({
		type: z.literal('pollEnded'),
		user: UserLiteSchema,
		userId: IdSchema,
		note: NoteSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('follow'),
		user: UserLiteSchema,
		userId: IdSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('receiveFollowRequest'),
		user: UserLiteSchema,
		userId: IdSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('followRequestAccepted'),
		user: UserLiteSchema,
		userId: IdSchema,
	}),
	NotificationBaseSchema.extend({
		type: z.literal('roleAssigned'),
		role: RoleSchema, // RoleLiteSchema?
	}),
	NotificationBaseSchema.extend({
		type: z.literal('app'),
		body: z.string(),
		header: z.string(),
		icon: z.string(),
	}),
	NotificationBaseSchema.extend({
		type: z.literal('reaction:grouped'),
		note: NoteSchema,
		reactions: z
			.object({
				user: UserLiteSchema,
				reaction: z.string(),
			})
			.array(),
	}),
	NotificationBaseSchema.extend({
		type: z.literal('renote:grouped'),
		note: NoteSchema,
		users: UserLiteSchema.array(),
	}),
	NotificationBaseSchema.extend({
		type: z.literal('test'),
	}),
]);
