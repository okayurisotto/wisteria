/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { DriveFolderSchema } from './drive-folder.js';
import { UserLiteSchema } from './user-lite.js';
import { IdSchema } from './IdSchema.js';

export const DriveFileSchema = z
	.object({
		id: IdSchema,
		createdAt: z.string() /* format: date-time */,
		name: z.string() /* example: "lenna.jpg" */,
		type: z.string() /* example: "image/jpeg" */,
		md5: z.string() /* format: md5 */ /* example: "15eca7fba0480996e2245f5185bf39f2" */,
		size: z.number() /* example: 51469 */,
		isSensitive: z.boolean(),
		blurhash: z.string().nullable(),
		properties: z
			.object({
				width: z.number().optional() /* example: 1280 */,
				height: z.number().optional() /* example: 720 */,
				orientation: z.number().optional() /* example: 8 */,
				avgColor: z.string().optional() /* example: "rgb(40,65,87)" */,
			})
			.strict(),
		url: z.string() /* format: url */,
		thumbnailUrl: z.string().nullable() /* format: url */,
		comment: z.string().nullable(),
		folderId: IdSchema.nullable(),
		folder: DriveFolderSchema.nullable().optional(),
		userId: IdSchema.nullable(),
		user: UserLiteSchema.nullable().optional(),
	})
	.strict();
