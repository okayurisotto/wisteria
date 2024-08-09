/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { UserLiteSchema } from './user.js';
import { DriveFileSchema } from './drive-file.js';
import { IdSchema } from './IdSchema.js';

const BlockBaseSchema = z
	.object({
		id: z.string(),
		type: z.string(),
	})
	.strict();

const TextBlockSchema = BlockBaseSchema.extend({
	type: z.literal('text'),
	text: z.string(),
});

const SectionBlockSchemaBase = BlockBaseSchema.extend({
	type: z.literal('section'),
	title: z.string(),
});

type SectionBlockSchemaType = z.infer<typeof SectionBlockSchemaBase> & {
	children: z.infer<typeof PageBlockSchema>[];
};

const SectionBlockSchema: z.ZodType<SectionBlockSchemaType> =
	SectionBlockSchemaBase.extend({
		children: z.lazy(() => PageBlockSchema).array(),
	});

const ImageBlockSchema = BlockBaseSchema.extend({
	type: z.literal('image'),
	fileId: z.string(),
});

const NoteBlockSchema = BlockBaseSchema.extend({
	type: z.literal('note'),
	detailed: z.boolean(),
	note: z.string(),
});

export const PageBlockSchema = z.union([
	TextBlockSchema,
	SectionBlockSchema,
	ImageBlockSchema,
	NoteBlockSchema,
]);

export const PageSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		updatedAt: z.string() /* format: date-time */,
		userId: IdSchema,
		user: UserLiteSchema,
		content: PageBlockSchema.array(),
		variables: z.record(z.string(), z.unknown()).array(),
		title: z.string(),
		name: z.string(),
		summary: z.string().nullable(),
		hideTitleWhenPinned: z.boolean(),
		alignCenter: z.boolean(),
		font: z.string(),
		script: z.string(),
		eyeCatchingImageId: z.string().nullable(),
		eyeCatchingImage: DriveFileSchema.nullable(),
		attachedFiles: DriveFileSchema.array(),
		likedCount: z.number(),
		isLiked: z.boolean().optional(),
	})
	.strict();
