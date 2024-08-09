/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

const DriveFolderSchemaBase = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		name: z.string(),
		parentId: IdSchema.nullable(),
		foldersCount: z.number().optional(),
		filesCount: z.number().optional(),
	})
	.strict();

type DriveFolderSchemaType = z.infer<typeof DriveFolderSchemaBase> & {
	parent?: DriveFolderSchemaType | null | undefined;
};

export const DriveFolderSchema: z.ZodType<DriveFolderSchemaType> =
	DriveFolderSchemaBase.extend({
		parent: z
			.lazy(() => DriveFolderSchema)
			.nullable()
			.optional(),
	}).strict();
