/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import type {
	MiRole,
	RoleAssignmentsRepository,
	RolesRepository,
	UsersRepository,
} from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { IdService } from '@/core/IdService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import type { NotificationCreateService } from './NotificationCreateService.js';
import type { OnModuleInit } from '@nestjs/common';

export type RolePolicies = {
	gtlAvailable: boolean;
	ltlAvailable: boolean;
	canPublicNote: boolean;
	canInvite: boolean;
	inviteLimit: number;
	inviteLimitCycle: number;
	inviteExpirationTime: number;
	canManageCustomEmojis: boolean;
	canManageAvatarDecorations: boolean;
	canSearchNotes: boolean;
	canUseTranslator: boolean;
	canHideAds: boolean;
	driveCapacityMb: number;
	alwaysMarkNsfw: boolean;
	pinLimit: number;
	antennaLimit: number;
	wordMuteLimit: number;
	webhookLimit: number;
	clipLimit: number;
	noteEachClipsLimit: number;
	userListLimit: number;
	userEachUserListsLimit: number;
	rateLimitFactor: number;
	avatarDecorationLimit: number;
};

export const DEFAULT_POLICIES: RolePolicies = {
	gtlAvailable: true,
	ltlAvailable: true,
	canPublicNote: true,
	canInvite: false,
	inviteLimit: 0,
	inviteLimitCycle: 60 * 24 * 7,
	inviteExpirationTime: 0,
	canManageCustomEmojis: false,
	canManageAvatarDecorations: false,
	canSearchNotes: false,
	canUseTranslator: true,
	canHideAds: false,
	driveCapacityMb: 100,
	alwaysMarkNsfw: false,
	pinLimit: 5,
	antennaLimit: 5,
	wordMuteLimit: 200,
	webhookLimit: 3,
	clipLimit: 10,
	noteEachClipsLimit: 200,
	userListLimit: 10,
	userEachUserListsLimit: 50,
	rateLimitFactor: 1,
	avatarDecorationLimit: 1,
};

@Injectable()
export class RoleService implements OnModuleInit {
	private notificationCreateService!: NotificationCreateService;

	public static AlreadyAssignedError = class extends Error {};
	public static NotAssignedError = class extends Error {};

	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private roleAssignmentsRepository: RoleAssignmentsRepository,

		private globalEventService: GlobalEventService,
		private idService: IdService,
		private moderationLogService: ModerationLogService,
	) {}

	async onModuleInit() {
		this.notificationCreateService = this.moduleRef.get('NotificationCreateService');
	}

	@bindThis
	public async getRoles() {
		const roles = await this.rolesRepository.findBy({});
		return roles;
	}

	@bindThis
	public async isExplorable(role: { id: MiRole['id']} | null): Promise<boolean> {
		if (role == null) return false;
		const check = await this.rolesRepository.findOneBy({ id: role.id });
		if (check == null) return false;
		return check.isExplorable;
	}

	@bindThis
	public async getModeratorIds(includeAdmins = true): Promise<MiUser['id'][]> {
		const roles = await this.rolesRepository.findBy({});
		const moderatorRoles = includeAdmins ? roles.filter(r => r.isModerator || r.isAdministrator) : roles.filter(r => r.isModerator);
		const assigns = moderatorRoles.length > 0 ? await this.roleAssignmentsRepository.findBy({
			roleId: In(moderatorRoles.map(r => r.id)),
		}) : [];
		// TODO: isRootなアカウントも含める
		return assigns.map(a => a.userId);
	}

	@bindThis
	public async getModerators(includeAdmins = true): Promise<MiUser[]> {
		const ids = await this.getModeratorIds(includeAdmins);
		const users = ids.length > 0 ? await this.usersRepository.findBy({
			id: In(ids),
		}) : [];
		return users;
	}

	@bindThis
	public async getAdministratorIds(): Promise<MiUser['id'][]> {
		const roles = await this.rolesRepository.findBy({});
		const administratorRoles = roles.filter(r => r.isAdministrator);
		const assigns = administratorRoles.length > 0 ? await this.roleAssignmentsRepository.findBy({
			roleId: In(administratorRoles.map(r => r.id)),
		}) : [];
		// TODO: isRootなアカウントも含める
		return assigns.map(a => a.userId);
	}

	@bindThis
	public async getAdministrators(): Promise<MiUser[]> {
		const ids = await this.getAdministratorIds();
		const users = ids.length > 0 ? await this.usersRepository.findBy({
			id: In(ids),
		}) : [];
		return users;
	}

	@bindThis
	public async assign(userId: MiUser['id'], roleId: MiRole['id'], expiresAt: Date | null = null, moderator?: MiUser): Promise<void> {
		const now = Date.now();

		const role = await this.rolesRepository.findOneByOrFail({ id: roleId });

		const existing = await this.roleAssignmentsRepository.findOneBy({
			roleId: roleId,
			userId: userId,
		});

		if (existing) {
			if (existing.expiresAt && (existing.expiresAt.getTime() < now)) {
				await this.roleAssignmentsRepository.delete({
					roleId: roleId,
					userId: userId,
				});
			} else {
				throw new RoleService.AlreadyAssignedError();
			}
		}

		const created = await this.roleAssignmentsRepository.insert({
			id: this.idService.gen(now),
			expiresAt: expiresAt,
			roleId: roleId,
			userId: userId,
		}).then(x => this.roleAssignmentsRepository.findOneByOrFail(x.identifiers[0]));

		this.rolesRepository.update(roleId, {
			lastUsedAt: new Date(),
		});

		if (role.isPublic) {
			this.notificationCreateService.createNotification(userId, 'roleAssigned', {
				roleId: roleId,
			});
		}

		if (moderator) {
			const user = await this.usersRepository.findOneByOrFail({ id: userId });
			this.moderationLogService.log(moderator, 'assignRole', {
				roleId: roleId,
				roleName: role.name,
				userId: userId,
				userUsername: user.username,
				userHost: user.host,
				expiresAt: expiresAt ? expiresAt.toISOString() : null,
			});
		}
	}

	@bindThis
	public async unassign(userId: MiUser['id'], roleId: MiRole['id'], moderator?: MiUser): Promise<void> {
		const now = new Date();

		const existing = await this.roleAssignmentsRepository.findOneBy({ roleId, userId });
		if (existing == null) {
			throw new RoleService.NotAssignedError();
		} else if (existing.expiresAt && (existing.expiresAt.getTime() < now.getTime())) {
			await this.roleAssignmentsRepository.delete({
				roleId: roleId,
				userId: userId,
			});
			throw new RoleService.NotAssignedError();
		}

		await this.roleAssignmentsRepository.delete(existing.id);

		this.rolesRepository.update(roleId, {
			lastUsedAt: now,
		});

		if (moderator) {
			const [user, role] = await Promise.all([
				this.usersRepository.findOneByOrFail({ id: userId }),
				this.rolesRepository.findOneByOrFail({ id: roleId }),
			]);
			this.moderationLogService.log(moderator, 'unassignRole', {
				roleId: roleId,
				roleName: role.name,
				userId: userId,
				userUsername: user.username,
				userHost: user.host,
			});
		}
	}

	@bindThis
	public async create(values: Partial<MiRole>, moderator?: MiUser): Promise<MiRole> {
		const date = new Date();
		const created = await this.rolesRepository.insert({
			id: this.idService.gen(date.getTime()),
			updatedAt: date,
			lastUsedAt: date,
			name: values.name,
			description: values.description,
			color: values.color,
			iconUrl: values.iconUrl,
			target: values.target,
			condFormula: values.condFormula,
			isPublic: values.isPublic,
			isAdministrator: values.isAdministrator,
			isModerator: values.isModerator,
			isExplorable: values.isExplorable,
			asBadge: values.asBadge,
			canEditMembersByModerator: values.canEditMembersByModerator,
			displayOrder: values.displayOrder,
			policies: values.policies,
		}).then(x => this.rolesRepository.findOneByOrFail(x.identifiers[0]));

		if (moderator) {
			this.moderationLogService.log(moderator, 'createRole', {
				roleId: created.id,
				role: created,
			});
		}

		return created;
	}

	@bindThis
	public async update(role: MiRole, params: Partial<MiRole>, moderator?: MiUser): Promise<void> {
		const date = new Date();
		await this.rolesRepository.update(role.id, {
			updatedAt: date,
			...params,
		});

		const updated = await this.rolesRepository.findOneByOrFail({ id: role.id });

		if (moderator) {
			this.moderationLogService.log(moderator, 'updateRole', {
				roleId: role.id,
				before: role,
				after: updated,
			});
		}
	}

	@bindThis
	public async delete(role: MiRole, moderator?: MiUser): Promise<void> {
		await this.rolesRepository.delete({ id: role.id });

		if (moderator) {
			this.moderationLogService.log(moderator, 'deleteRole', {
				roleId: role.id,
				role: role,
			});
		}
	}
}
