/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { z } from 'zod';
import { NoteSchema } from './note.js';
import { PageSchema } from './page.js';
import { RoleLiteSchema, RolePoliciesSchema } from './role.js';
import { IdSchema } from './IdSchema.js';
import { AnnouncementSchema } from './announcement.js';
import { UserLiteSchema } from './user-lite.js';

export const LocalUsernameSchema = z.string().regex(/^\w{1,20}$/);
export const PasswordSchema = z.string().min(1);
export const NameSchema = z.string().min(1).max(50);
export const DescriptionSchema = z.string().min(1).max(1500);
export const LocationSchema = z.string().min(1).max(50);
export const BirthdaySchema = z.string().regex(/^(\d{4})-(\d{2})-(\d{2})$/);

export const NotificationRecieveConfig = z.union([
	z
		.object({
			type: z.enum(['all', 'following', 'follower', 'mutualFollow', 'never']),
		})
		.strict(),
	z
		.object({
			type: z.enum(['list']),
			userListId: IdSchema,
		})
		.strict(),
]);

export const UserDetailedNotMeOnlySchema = z
	.object({
		url: z.string().nullable() /* format: url */,
		uri: z.string().nullable() /* format: uri */,
		movedTo: z.string().nullable() /* format: uri */,
		alsoKnownAs: IdSchema.array().nullable(),
		createdAt: z.string() /* format: date-time */,
		updatedAt: z.string().nullable() /* format: date-time */,
		lastFetchedAt: z.string().nullable() /* format: date-time */,
		bannerUrl: z.string().nullable() /* format: url */,
		bannerBlurhash: z.string().nullable(),
		isLocked: z.boolean(),
		isSilenced: z.boolean(),
		isSuspended: z.boolean() /* example: false */,
		description: z.string().nullable() /* example: "Hi masters, I am Ai!" */,
		location: z.string().nullable(),
		birthday: z.string().nullable() /* example: "2018-03-12" */,
		lang: z.string().nullable() /* example: "ja-JP" */,
		fields: z
			.object({
				name: z.string(),
				value: z.string(),
			})
			.strict()
			.array()
			.max(16),
		verifiedLinks: z
			.string() /* format: url */
			.array(),
		followersCount: z.number(),
		followingCount: z.number(),
		notesCount: z.number(),
		pinnedNoteIds: IdSchema.array(),
		pinnedNotes: NoteSchema.array(),
		pinnedPageId: z.string().nullable(),
		pinnedPage: PageSchema.nullable(),
		publicReactions: z.boolean(),
		followingVisibility: z.enum(['public', 'followers', 'private']),
		followersVisibility: z.enum(['public', 'followers', 'private']),
		twoFactorEnabled: z.boolean().default(false),
		usePasswordLessLogin: z.boolean().default(false),
		securityKeys: z.boolean().default(false),
		roles: RoleLiteSchema.array(),
		memo: z.string().nullable(),
		moderationNote: z.string().optional(),
		isFollowing: z.boolean().optional(),
		isFollowed: z.boolean().optional(),
		hasPendingFollowRequestFromYou: z.boolean().optional(),
		hasPendingFollowRequestToYou: z.boolean().optional(),
		isBlocking: z.boolean().optional(),
		isBlocked: z.boolean().optional(),
		isMuted: z.boolean().optional(),
		isRenoteMuted: z.boolean().optional(),
		notify: z.enum(['normal', 'none']).optional(),
		withReplies: z.boolean().optional(),
	})
	.strict();

export const MeDetailedOnlySchema = z
	.object({
		avatarId: IdSchema.nullable(),
		bannerId: IdSchema.nullable(),
		isModerator: z.boolean().nullable(),
		isAdmin: z.boolean().nullable(),
		injectFeaturedNote: z.boolean(),
		receiveAnnouncementEmail: z.boolean(),
		alwaysMarkNsfw: z.boolean(),
		autoSensitive: z.boolean(),
		carefulBot: z.boolean(),
		autoAcceptFollowed: z.boolean(),
		noCrawle: z.boolean(),
		preventAiLearning: z.boolean(),
		isExplorable: z.boolean(),
		isDeleted: z.boolean(),
		twoFactorBackupCodesStock: z.enum(['full', 'partial', 'none']),
		hideOnlineStatus: z.boolean(),
		hasUnreadSpecifiedNotes: z.boolean(),
		hasUnreadMentions: z.boolean(),
		hasUnreadAnnouncement: z.boolean(),
		unreadAnnouncements: AnnouncementSchema.array(),
		hasUnreadAntenna: z.boolean(),
		hasUnreadChannel: z.boolean(),
		hasUnreadNotification: z.boolean(),
		hasPendingReceivedFollowRequest: z.boolean(),
		unreadNotificationsCount: z.number(),
		mutedWords: z.string().array().array(),
		hardMutedWords: z.string().array().array(),
		mutedInstances: z.string().array().nullable(),
		emailNotificationTypes: z.string().array(),
		achievements: z
			.object({
				name: z.string(),
				unlockedAt: z.number(),
			})
			.strict()
			.array(),
		loggedInDays: z.number(),
		policies: RolePoliciesSchema,
		email: z.string().nullable().optional(),
		emailVerified: z.boolean().nullable().optional(),
		securityKeysList: z
			.object({
				id: IdSchema,
				name: z.string(),
				lastUsed: z.string() /* format: date-time */,
			})
			.strict()
			.array()
			.optional(),
		notificationRecieveConfig: z.object({
			note: NotificationRecieveConfig.optional(),
			follow: NotificationRecieveConfig.optional(),
			mention: NotificationRecieveConfig.optional(),
			reply: NotificationRecieveConfig.optional(),
			renote: NotificationRecieveConfig.optional(),
			quote: NotificationRecieveConfig.optional(),
			reaction: NotificationRecieveConfig.optional(),
			pollEnded: NotificationRecieveConfig.optional(),
			receiveFollowRequest: NotificationRecieveConfig.optional(),
			followRequestAccepted: NotificationRecieveConfig.optional(),
			roleAssigned: NotificationRecieveConfig.optional(),
			achievementEarned: NotificationRecieveConfig.optional(),
			app: NotificationRecieveConfig.optional(),
			test: NotificationRecieveConfig.optional(),
		}),
	})
	.strict();

export const UserDetailedNotMeSchema = UserLiteSchema.merge(
	UserDetailedNotMeOnlySchema,
);

export const MeDetailedSchema = UserLiteSchema.merge(
	UserDetailedNotMeOnlySchema,
).merge(MeDetailedOnlySchema);

export const UserDetailedSchema = z.union([
	UserDetailedNotMeSchema,
	MeDetailedSchema,
]);

export const UserSchema = z.union([UserLiteSchema, UserDetailedSchema]);
