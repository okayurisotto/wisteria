/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { IdSchema } from './IdSchema.js';

const RoleCondFormulaLogicsSchemaBase = z
	.object({
		id: z.string(),
		type: z.enum(['and', 'or']),
	})
	.strict();

type RoleCondFormulaLogicsSchemaType = z.infer<
	typeof RoleCondFormulaLogicsSchemaBase
> & {
	values: z.infer<typeof RoleCondFormulaValueSchema>[];
};

export const RoleCondFormulaLogicsSchema: z.ZodType<RoleCondFormulaLogicsSchemaType> =
	RoleCondFormulaLogicsSchemaBase.extend({
		values: z.lazy(() => RoleCondFormulaValueSchema).array(),
	}).strict();

const RoleCondFormulaValueNotSchemaBase = z
	.object({
		id: z.string(),
		type: z.enum(['not']),
	})
	.strict();

type RoleCondFormulaValueNotSchemaType = z.infer<
	typeof RoleCondFormulaValueNotSchemaBase
> & {
	value: z.infer<typeof RoleCondFormulaValueSchema>;
};

export const RoleCondFormulaValueNotSchema: z.ZodType<RoleCondFormulaValueNotSchemaType> =
	RoleCondFormulaValueNotSchemaBase.extend({
		value: z.lazy(() => RoleCondFormulaValueSchema),
	}).strict();

export const RoleCondFormulaValueIsLocalOrRemoteSchema = z
	.object({
		id: z.string(),
		type: z.enum(['isLocal', 'isRemote']),
	})
	.strict();

export const RoleCondFormulaValueCreatedSchema = z
	.object({
		id: z.string(),
		type: z.enum(['createdLessThan', 'createdMoreThan']),
		sec: z.number(),
	})
	.strict();

export const RoleCondFormulaFollowersOrFollowingOrNotesSchema = z
	.object({
		id: z.string(),
		type: z.enum([
			'followersLessThanOrEq',
			'followersMoreThanOrEq',
			'followingLessThanOrEq',
			'followingMoreThanOrEq',
			'notesLessThanOrEq',
			'notesMoreThanOrEq',
		]),
		value: z.number(),
	})
	.strict();

export const RoleCondFormulaValueSchema = z.union([
	RoleCondFormulaLogicsSchema,
	RoleCondFormulaValueNotSchema,
	RoleCondFormulaValueIsLocalOrRemoteSchema,
	RoleCondFormulaValueCreatedSchema,
	RoleCondFormulaFollowersOrFollowingOrNotesSchema,
]);

export const RolePoliciesSchema = z
	.object({
		gtlAvailable: z.boolean(),
		ltlAvailable: z.boolean(),
		canPublicNote: z.boolean(),
		canInvite: z.boolean(),
		inviteLimit: z.number().int(),
		inviteLimitCycle: z.number().int(),
		inviteExpirationTime: z.number().int(),
		canManageCustomEmojis: z.boolean(),
		canManageAvatarDecorations: z.boolean(),
		canSearchNotes: z.boolean(),
		canUseTranslator: z.boolean(),
		canHideAds: z.boolean(),
		driveCapacityMb: z.number().int(),
		alwaysMarkNsfw: z.boolean(),
		pinLimit: z.number().int(),
		antennaLimit: z.number().int(),
		wordMuteLimit: z.number().int(),
		webhookLimit: z.number().int(),
		clipLimit: z.number().int(),
		noteEachClipsLimit: z.number().int(),
		userListLimit: z.number().int(),
		userEachUserListsLimit: z.number().int(),
		rateLimitFactor: z.number().int(),
		avatarDecorationLimit: z.number().int(),
	})
	.strict();

export const RoleLiteSchema = z
	.object({
		id: IdSchema,
		name: z.string() /* example: `New Role` */,
		color: z.string().nullable() /* example: `#000000` */,
		iconUrl: z.string().nullable(),
		description: z.string(),
		isModerator: z.boolean(),
		isAdministrator: z.boolean(),
		displayOrder: z.number().int() /* example: `0` */,
	})
	.strict();

export const RoleSchema = RoleLiteSchema.extend({
	createdAt: z.string() /* format: date-time */,
	updatedAt: z.string() /* format: date-time */,
	target: z.enum(['manual', 'conditional']),
	condFormula: RoleCondFormulaValueSchema,
	isPublic: z.boolean(),
	isExplorable: z.boolean(),
	asBadge: z.boolean(),
	canEditMembersByModerator: z.boolean(),
	policies: z.record(
		z.string(),
		z.object({
			value: z.union([z.number().int(), z.boolean()]),
			priority: z.number().int(),
			useDefault: z.boolean(),
		}),
	),
	usersCount: z.number().int(),
});
