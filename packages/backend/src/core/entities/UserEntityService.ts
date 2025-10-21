/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type { Promiseable } from '@/misc/prelude/await-all.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import { localUsernameSchema, passwordSchema } from '@/models/User.js';
import type { UsersRepository, UserSecurityKeysRepository, FollowingsRepository, FollowRequestsRepository, BlockingsRepository, MutingsRepository, NoteUnreadsRepository, UserNotePiningsRepository, UserProfilesRepository, MiUserProfile, RenoteMutingsRepository, UserMemoRepository, InstancesRepository } from '@/models/_.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { IdService } from '@/core/IdService.js';
import { AnnouncementService } from '@/core/AnnouncementService.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { NoteEntityService } from './NoteEntityService.js';
import { PageEntityService } from './PageEntityService.js';
import { CustomEmojiPopulateService } from '../CustomEmojiPopulateService.js';
import { RoleUserService } from '../RoleUserService.js';
import { isLocalUser } from '@/misc/isLocalUser.js';
import type { MeDetailedSchema, UserDetailedNotMeSchema, UserDetailedSchema } from '@/models/zod/user.js';
import type { UserLiteSchema } from '@/models/zod/user-lite.js';
import type { z } from 'zod';
import { UserLiteEntityService } from './UserLiteEntityService.js';

type Refs = {
	MeDetailed: typeof MeDetailedSchema;
	UserDetailedNotMe: typeof UserDetailedNotMeSchema;
	UserDetailed: typeof UserDetailedSchema;
	UserLite: typeof UserLiteSchema;
};

@Injectable()
export class UserEntityService {
	constructor(
		@Inject(DI.redis)
		private readonly redisClient: Redis.Redis,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userSecurityKeysRepository)
		private readonly userSecurityKeysRepository: UserSecurityKeysRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		@Inject(DI.mutingsRepository)
		private readonly mutingsRepository: MutingsRepository,

		@Inject(DI.renoteMutingsRepository)
		private readonly renoteMutingsRepository: RenoteMutingsRepository,

		@Inject(DI.noteUnreadsRepository)
		private readonly noteUnreadsRepository: NoteUnreadsRepository,

		@Inject(DI.userNotePiningsRepository)
		private readonly userNotePiningsRepository: UserNotePiningsRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.userMemosRepository)
		private readonly userMemosRepository: UserMemoRepository,

		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		private readonly idService: IdService,
		private readonly announcementService: AnnouncementService,
		private readonly avatarDecorationService: AvatarDecorationService,
		private readonly noteEntityService: NoteEntityService,
		private readonly customEmojiPopulateService: CustomEmojiPopulateService,
		private readonly roleUserService: RoleUserService,
		private readonly userLiteEntityService: UserLiteEntityService,
		private readonly pageEntityService: PageEntityService,
		private readonly apPersonService: ApPersonService,
	) {}

	// #region Validators
	public validateLocalUsername = (v: unknown) => localUsernameSchema.safeParse(v).success;
	public validatePassword = (v: unknown) => passwordSchema.safeParse(v).success;
	// #endregion

	public async getRelation(me: MiUser['id'], target: MiUser['id']) {
		const [
			following,
			isFollowed,
			hasPendingFollowRequestFromYou,
			hasPendingFollowRequestToYou,
			isBlocking,
			isBlocked,
			isMuted,
			isRenoteMuted,
		] = await Promise.all([
			this.followingsRepository.findOneBy({
				followerId: me,
				followeeId: target,
			}),
			this.followingsRepository.exists({
				where: {
					followerId: target,
					followeeId: me,
				},
			}),
			this.followRequestsRepository.exists({
				where: {
					followerId: me,
					followeeId: target,
				},
			}),
			this.followRequestsRepository.exists({
				where: {
					followerId: target,
					followeeId: me,
				},
			}),
			this.blockingsRepository.exists({
				where: {
					blockerId: me,
					blockeeId: target,
				},
			}),
			this.blockingsRepository.exists({
				where: {
					blockerId: target,
					blockeeId: me,
				},
			}),
			this.mutingsRepository.exists({
				where: {
					muterId: me,
					muteeId: target,
				},
			}),
			this.renoteMutingsRepository.exists({
				where: {
					muterId: me,
					muteeId: target,
				},
			}),
		]);

		return {
			id: target,
			following,
			isFollowing: following != null,
			isFollowed,
			hasPendingFollowRequestFromYou,
			hasPendingFollowRequestToYou,
			isBlocking,
			isBlocked,
			isMuted,
			isRenoteMuted,
		};
	}

	private async getNotificationsInfo(userId: MiUser['id']): Promise<{
		hasUnread: boolean;
		unreadCount: number;
	}> {
		const response = {
			hasUnread: false,
			unreadCount: 0,
		};

		const latestReadNotificationId = await this.redisClient.get(`latestReadNotification:${userId}`);

		if (!latestReadNotificationId) {
			response.unreadCount = await this.redisClient.xlen(`notificationTimeline:${userId}`);
		} else {
			const latestNotificationIdsRes = await this.redisClient.xrevrange(
				`notificationTimeline:${userId}`,
				'+',
				latestReadNotificationId,
			);

			response.unreadCount = (latestNotificationIdsRes.length - 1 >= 0) ? latestNotificationIdsRes.length - 1 : 0;
		}

		if (response.unreadCount > 0) {
			response.hasUnread = true;
		}

		return response;
	}

	private async getHasPendingReceivedFollowRequest(userId: MiUser['id']): Promise<boolean> {
		const count = await this.followRequestsRepository.countBy({
			followeeId: userId,
		});

		return count > 0;
	}

	public async pack<S extends 'MeDetailed' | 'UserDetailedNotMe' | 'UserDetailed'>(
		src: MiUser['id'] | MiUser,
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			schema?: S;
			includeSecrets?: boolean;
			userProfile?: MiUserProfile;
		},
	): Promise<z.infer<Refs[S]>> {
		const opts = Object.assign({
			schema: 'UserLite',
			includeSecrets: false,
		}, options);

		const user = typeof src === 'object' ? src : await this.usersRepository.findOneByOrFail({ id: src });

		const meId = me ? me.id : null;
		const isMe = meId === user.id;
		const iAmModerator = me ? await this.roleUserService.isModerator(me as MiUser) : false;

		const relation = meId && !isMe && true ? await this.getRelation(meId, user.id) : null;
		const pins = await this.userNotePiningsRepository.createQueryBuilder('pin')
			.where('pin.userId = :userId', { userId: user.id })
			.innerJoinAndSelect('pin.note', 'note')
			.orderBy('pin.id', 'DESC')
			.getMany();
		const profile = opts.userProfile ?? await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

		const followingCount = profile == null
			? null
			: (profile.followingVisibility === 'public') || isMe
					? user.followingCount
					: profile.followingVisibility === 'followers' && relation?.isFollowing
							? user.followingCount
							: null;

		const followersCount = profile == null
			? null
			: (profile.followersVisibility === 'public') || isMe
					? user.followersCount
					: profile.followersVisibility === 'followers' && relation?.isFollowing
							? user.followersCount
							: null;

		const isModerator = isMe ? this.roleUserService.isModerator(user) : null;
		const isAdmin = isMe ? this.roleUserService.isAdministrator(user) : null;
		const unreadAnnouncements = isMe
			? (await this.announcementService.getUnreadAnnouncements(user)).map(announcement => ({
					createdAt: this.idService.parse(announcement.id).date.toISOString(),
					...announcement,
				}))
			: null;

		const notificationsInfo = isMe ? await this.getNotificationsInfo(user.id) : null;

		const packed = {
			id: user.id,
			name: user.name,
			username: user.username,
			host: user.host,
			avatarUrl: user.avatarUrl ?? this.userLiteEntityService.getIdenticonUrl(user),
			avatarBlurhash: user.avatarBlurhash,
			avatarDecorations: user.avatarDecorations.length > 0
				? this.avatarDecorationService.getAll().then(decorations => user.avatarDecorations.filter(ud => decorations.some(d => d.id === ud.id)).map(ud => ({
					id: ud.id,
					angle: ud.angle || undefined,
					flipH: ud.flipH || undefined,
					offsetX: ud.offsetX || undefined,
					offsetY: ud.offsetY || undefined,
					url: decorations.find(d => d.id === ud.id)!.url,
				})))
				: [],
			isBot: user.isBot,
			isCat: user.isCat,
			instance: user.host
				? this.instancesRepository.findOneBy({ host: user.host }).then(instance => instance
					? {
							name: instance.name,
							softwareName: instance.softwareName,
							softwareVersion: instance.softwareVersion,
							iconUrl: instance.iconUrl,
							faviconUrl: instance.faviconUrl,
							themeColor: instance.themeColor,
						}
					: undefined)
				: undefined,
			emojis: this.customEmojiPopulateService.populateEmojis(user.emojis, user.host),
			onlineStatus: this.userLiteEntityService.getOnlineStatus(user),
			// パフォーマンス上の理由でローカルユーザーのみ
			badgeRoles: user.host == null
				? this.roleUserService.getUserBadgeRoles(user.id).then(rs => rs.sort((a, b) => b.displayOrder - a.displayOrder).map(r => ({
					name: r.name,
					iconUrl: r.iconUrl,
					displayOrder: r.displayOrder,
				})))
				: undefined,
			url: profile.url,
			uri: user.uri,
			movedTo: user.movedToUri ? this.apPersonService.resolvePerson(user.movedToUri).then(user => user.id).catch(() => null) : null,
			alsoKnownAs: user.alsoKnownAs
				? Promise.all(user.alsoKnownAs.map(uri => this.apPersonService.fetchPerson(uri).then(user => user?.id).catch(() => null)))
					.then(xs => xs.length === 0 ? null : xs.filter(x => x != null))
				: null,
			createdAt: this.idService.parse(user.id).date.toISOString(),
			updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
			lastFetchedAt: user.lastFetchedAt ? user.lastFetchedAt.toISOString() : null,
			bannerUrl: user.bannerUrl,
			bannerBlurhash: user.bannerBlurhash,
			isLocked: user.isLocked,
			isSilenced: this.roleUserService.getUserPolicies(user.id).then(r => !r.canPublicNote),
			isSuspended: user.isSuspended,
			description: profile.description,
			location: profile.location,
			birthday: profile.birthday,
			lang: profile.lang,
			fields: profile.fields,
			verifiedLinks: profile.verifiedLinks,
			followersCount: followersCount ?? 0,
			followingCount: followingCount ?? 0,
			notesCount: user.notesCount,
			pinnedNoteIds: pins.map(pin => pin.noteId),
			pinnedNotes: this.noteEntityService.packMany(pins.map(pin => pin.note!), me, { detail: true }),
			pinnedPageId: profile.pinnedPageId,
			pinnedPage: profile.pinnedPageId ? this.pageEntityService.pack(profile.pinnedPageId, me) : null,
			publicReactions: isLocalUser(user) ? profile.publicReactions : false, // https://github.com/misskey-dev/misskey/issues/12964
			followersVisibility: profile.followersVisibility,
			followingVisibility: profile.followingVisibility,
			twoFactorEnabled: profile.twoFactorEnabled,
			usePasswordLessLogin: profile.usePasswordLessLogin,
			securityKeys: profile.twoFactorEnabled
				? this.userSecurityKeysRepository.countBy({
					userId: user.id,
				}).then(result => result >= 1)
				: false,
			roles: this.roleUserService.getUserRoles(user.id).then(roles => roles.filter(role => role.isPublic).sort((a, b) => b.displayOrder - a.displayOrder).map(role => ({
				id: role.id,
				name: role.name,
				color: role.color,
				iconUrl: role.iconUrl,
				description: role.description,
				isModerator: role.isModerator,
				isAdministrator: role.isAdministrator,
				displayOrder: role.displayOrder,
			}))),
			memo: meId == null
				? null
				: await this.userMemosRepository.findOneBy({
					userId: meId,
					targetUserId: user.id,
				}).then(row => row?.memo ?? null),
			moderationNote: iAmModerator ? (profile.moderationNote ?? '') : undefined,

			...(isMe ? {
				avatarId: user.avatarId,
				bannerId: user.bannerId,
				isModerator: isModerator,
				isAdmin: isAdmin,
				injectFeaturedNote: profile.injectFeaturedNote,
				receiveAnnouncementEmail: profile.receiveAnnouncementEmail,
				alwaysMarkNsfw: profile.alwaysMarkNsfw,
				autoSensitive: profile.autoSensitive,
				carefulBot: profile.carefulBot,
				autoAcceptFollowed: profile.autoAcceptFollowed,
				noCrawle: profile.noCrawle,
				preventAiLearning: profile.preventAiLearning,
				isExplorable: user.isExplorable,
				isDeleted: user.isDeleted,
				twoFactorBackupCodesStock: profile?.twoFactorBackupSecret?.length === 5 ? 'full' : (profile?.twoFactorBackupSecret?.length ?? 0) > 0 ? 'partial' : 'none',
				hideOnlineStatus: user.hideOnlineStatus,
				hasUnreadSpecifiedNotes: this.noteUnreadsRepository.count({
					where: { userId: user.id, isSpecified: true },
					take: 1,
				}).then(count => count > 0),
				hasUnreadMentions: this.noteUnreadsRepository.count({
					where: { userId: user.id, isMentioned: true },
					take: 1,
				}).then(count => count > 0),
				hasUnreadAnnouncement: unreadAnnouncements!.length > 0,
				unreadAnnouncements,
				hasUnreadAntenna: false,
				hasUnreadChannel: false, // 後方互換性のため
				hasUnreadNotification: notificationsInfo?.hasUnread, // 後方互換性のため
				hasPendingReceivedFollowRequest: this.getHasPendingReceivedFollowRequest(user.id),
				unreadNotificationsCount: notificationsInfo?.unreadCount,
				mutedWords: profile.mutedWords,
				hardMutedWords: profile.hardMutedWords,
				mutedInstances: profile.mutedInstances,
				mutingNotificationTypes: [], // 後方互換性のため
				notificationRecieveConfig: profile.notificationRecieveConfig,
				emailNotificationTypes: profile.emailNotificationTypes,
				loggedInDays: profile.loggedInDates.length,
				policies: this.roleUserService.getUserPolicies(user.id),
			} : {}),

			...(opts.includeSecrets
				? {
						email: profile.email,
						emailVerified: profile.emailVerified,
						securityKeysList: profile.twoFactorEnabled
							? this.userSecurityKeysRepository.find({
								where: {
									userId: user.id,
								},
								select: {
									id: true,
									name: true,
									lastUsed: true,
								},
							})
							: [],
					}
				: {}),

			...(relation
				? {
						isFollowing: relation.isFollowing,
						isFollowed: relation.isFollowed,
						hasPendingFollowRequestFromYou: relation.hasPendingFollowRequestFromYou,
						hasPendingFollowRequestToYou: relation.hasPendingFollowRequestToYou,
						isBlocking: relation.isBlocking,
						isBlocked: relation.isBlocked,
						isMuted: relation.isMuted,
						isRenoteMuted: relation.isRenoteMuted,
						notify: relation.following?.notify ?? 'none',
						withReplies: relation.following?.withReplies ?? false,
					}
				: {}),
		} as Promiseable<z.infer<Refs[S]>>;

		return await awaitAll(packed);
	}

	public packMany<S extends 'MeDetailed' | 'UserDetailedNotMe' | 'UserDetailed'>(
		users: (MiUser['id'] | MiUser)[],
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			schema?: S;
			includeSecrets?: boolean;
		},
	): Promise<z.infer<Refs[S]>[]> {
		return Promise.all(users.map(u => this.pack(u, me, options)));
	}
}
