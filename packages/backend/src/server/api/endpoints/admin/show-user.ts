/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, SigninsRepository, UserProfilesRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { RoleEntityService } from '@/core/entities/RoleEntityService.js';
import { IdService } from '@/core/IdService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NotificationRecieveConfig } from '@/models/zod/user';
import { SigninSchema } from '@/models/zod/signin';
import { RolePoliciesSchema, RoleSchema } from '@/models/zod/role';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:show-user',

	res: z.object({
		email: z.string().nullable(),
		emailVerified: z.boolean(),
		autoAcceptFollowed: z.boolean(),
		noCrawle: z.boolean(),
		preventAiLearning: z.boolean(),
		alwaysMarkNsfw: z.boolean(),
		autoSensitive: z.boolean(),
		carefulBot: z.boolean(),
		injectFeaturedNote: z.boolean(),
		receiveAnnouncementEmail: z.boolean(),
		mutedWords: z.union([z.string(), z.string().array()]).array(),
		mutedInstances: z.string().array(),
		notificationRecieveConfig: z.object({
			note: NotificationRecieveConfig,
			follow: NotificationRecieveConfig,
			mention: NotificationRecieveConfig,
			reply: NotificationRecieveConfig,
			renote: NotificationRecieveConfig,
			quote: NotificationRecieveConfig,
			reaction: NotificationRecieveConfig,
			pollEnded: NotificationRecieveConfig,
			receiveFollowRequest: NotificationRecieveConfig,
			followRequestAccepted: NotificationRecieveConfig,
			roleAssigned: NotificationRecieveConfig,
			achievementEarned: NotificationRecieveConfig,
			app: NotificationRecieveConfig,
			test: NotificationRecieveConfig,
		}).partial(),
		isModerator: z.boolean(),
		isSilenced: z.boolean(),
		isSuspended: z.boolean(),
		isHibernated: z.boolean(),
		lastActiveDate: z.string().nullable(),
		moderationNote: z.string(),
		signins: SigninSchema.array(),
		policies: RolePoliciesSchema,
		roles: RoleSchema.array(),
		roleAssigns: z.object({
			createdAt: z.string(),
			expiresAt: z.string().nullable(),
			roleId: z.string(),
		}).array(),
	}).partial(),
} as const;

export const paramDef = z.object({
	userId: IdSchema,
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.signinsRepository)
		private readonly signinsRepository: SigninsRepository,

		private readonly roleUserService: RoleUserService,
		private readonly roleEntityService: RoleEntityService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const [user, profile] = await Promise.all([
				this.usersRepository.findOneBy({ id: ps.userId }),
				this.userProfilesRepository.findOneBy({ userId: ps.userId }),
			]);

			if (user == null || profile == null) {
				throw new Error('user not found');
			}

			const isModerator = await this.roleUserService.isModerator(user);
			const isSilenced = !(await this.roleUserService.getUserPolicies(user.id)).canPublicNote;

			const _me = await this.usersRepository.findOneByOrFail({ id: me.id });
			if (!await this.roleUserService.isAdministrator(_me) && await this.roleUserService.isAdministrator(user)) {
				throw new Error('cannot show info of admin');
			}

			const signins = await this.signinsRepository.findBy({ userId: user.id });

			const roleAssigns = await this.roleUserService.getUserAssigns(user.id);
			const roles = await this.roleUserService.getUserRoles(user.id);

			return {
				email: profile.email,
				emailVerified: profile.emailVerified,
				autoAcceptFollowed: profile.autoAcceptFollowed,
				noCrawle: profile.noCrawle,
				preventAiLearning: profile.preventAiLearning,
				alwaysMarkNsfw: profile.alwaysMarkNsfw,
				autoSensitive: profile.autoSensitive,
				carefulBot: profile.carefulBot,
				injectFeaturedNote: profile.injectFeaturedNote,
				receiveAnnouncementEmail: profile.receiveAnnouncementEmail,
				mutedWords: profile.mutedWords,
				mutedInstances: profile.mutedInstances,
				notificationRecieveConfig: profile.notificationRecieveConfig,
				isModerator: isModerator,
				isSilenced: isSilenced,
				isSuspended: user.isSuspended,
				isHibernated: user.isHibernated,
				lastActiveDate: user.lastActiveDate ? user.lastActiveDate.toISOString() : null,
				moderationNote: profile.moderationNote ?? '',
				signins,
				policies: await this.roleUserService.getUserPolicies(user.id),
				roles: await this.roleEntityService.packMany(roles, me),
				roleAssigns: roleAssigns.map(a => ({
					createdAt: this.idService.parse(a.id).date.toISOString(),
					expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
					roleId: a.roleId,
				})),
			};
		});
	}
}
