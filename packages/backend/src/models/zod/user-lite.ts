import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

export const UserLiteSchema = z
	.object({
		id: IdSchema,
		name: z.string().nullable() /* example: "藍" */,
		username: z.string() /* example: "ai" */,
		host: z
			.string()
			.nullable()
			.describe(
				'The local host is represented with `null`.',
			) /* example: "misskey.example.com" */,
		avatarUrl: z.string().nullable() /* format: url */,
		avatarBlurhash: z.string().nullable(),
		avatarDecorations: z
			.object({
				id: IdSchema,
				angle: z.number().optional(),
				flipH: z.boolean().optional(),
				url: z.string() /* format: url */,
				offsetX: z.number().optional(),
				offsetY: z.number().optional(),
			})
			.strict()
			.array(),
		isBot: z.boolean().optional(),
		isCat: z.boolean().optional(),
		instance: z
			.object({
				name: z.string().nullable(),
				softwareName: z.string().nullable(),
				softwareVersion: z.string().nullable(),
				iconUrl: z.string().nullable(),
				faviconUrl: z.string().nullable(),
				themeColor: z.string().nullable(),
			})
			.strict()
			.optional(),
		emojis: z.record(z.string(), z.unknown()),
		onlineStatus: z.enum(['unknown', 'online', 'active', 'offline']),
		badgeRoles: z
			.object({
				name: z.string(),
				iconUrl: z.string().nullable(),
				displayOrder: z.number(),
			})
			.strict()
			.array()
			.optional(),
	})
	.strict();
