/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { RoleAssignmentsRepository, RolesRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import { CacheService } from '@/core/CacheService.js';
import type { MiRole, RoleCondFormulaValue } from '@/models/Role.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { IdService } from '@/core/IdService.js';
import type { Packed } from '@/misc/json-schema.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';

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
export class RoleUserService {
	public static AlreadyAssignedError = class extends Error {};
	public static NotAssignedError = class extends Error {};

	constructor(
		@Inject(DI.redisForTimelines)
		private redisForTimelines: Redis.Redis,

		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private roleAssignmentsRepository: RoleAssignmentsRepository,

		private metaService: MetaService,
		private cacheService: CacheService,
		private userEntityService: UserEntityService,
		private globalEventService: GlobalEventService,
		private idService: IdService,
		private fanoutTimelineService: FanoutTimelineService,
	) {}

	private evalCond(user: MiUser, value: RoleCondFormulaValue): boolean {
		try {
			switch (value.type) {
				case 'and': {
					return value.values.every((v) => this.evalCond(user, v));
				}
				case 'or': {
					return value.values.some((v) => this.evalCond(user, v));
				}
				case 'not': {
					return !this.evalCond(user, value.value);
				}
				case 'isLocal': {
					return this.userEntityService.isLocalUser(user);
				}
				case 'isRemote': {
					return this.userEntityService.isRemoteUser(user);
				}
				case 'createdLessThan': {
					return (
						this.idService.parse(user.id).date.getTime() >
						Date.now() - value.sec * 1000
					);
				}
				case 'createdMoreThan': {
					return (
						this.idService.parse(user.id).date.getTime() <
						Date.now() - value.sec * 1000
					);
				}
				case 'followersLessThanOrEq': {
					return user.followersCount <= value.value;
				}
				case 'followersMoreThanOrEq': {
					return user.followersCount >= value.value;
				}
				case 'followingLessThanOrEq': {
					return user.followingCount <= value.value;
				}
				case 'followingMoreThanOrEq': {
					return user.followingCount >= value.value;
				}
				case 'notesLessThanOrEq': {
					return user.notesCount <= value.value;
				}
				case 'notesMoreThanOrEq': {
					return user.notesCount >= value.value;
				}
				default:
					return false;
			}
		} catch (err) {
			// TODO: log error
			return false;
		}
	}

	@bindThis
	public async getUserAssigns(userId: MiUser['id']) {
		const now = Date.now();
		const assigns = await this.roleAssignmentsRepository.findBy({ userId });
		return (
			// 期限切れのロールを除外
			assigns.filter((a) => a.expiresAt === null || a.expiresAt.getTime() > now)
		);
	}

	private async filterRoles(
		roles: MiRole[],
		userId: MiUser['id'],
	): Promise<MiRole[]> {
		const condRoles = roles.filter((r) => r.target === 'conditional');

		const assigns = await this.getUserAssigns(userId);
		const assignedRoleIds = new Set(assigns.map((a) => a.roleId));

		const assignedRoles = roles.filter((r) => {
			return assignedRoleIds.has(r.id);
		});

		const matchedCondRoles = await (async () => {
			if (condRoles.length === 0) return [];

			const user = await this.cacheService.findUserById(userId);
			return condRoles.filter((r) => {
				return this.evalCond(user, r.condFormula);
			});
		})();

		return [...assignedRoles, ...matchedCondRoles];
	}

	@bindThis
	public async getUserRoles(userId: MiUser['id']) {
		const roles = await this.rolesRepository.findBy({});
		return this.filterRoles(roles, userId);
	}

	/**
	 * 指定ユーザーのバッジロール一覧取得
	 */
	@bindThis
	public async getUserBadgeRoles(userId: MiUser['id']) {
		const roles = await this.rolesRepository.findBy({ asBadge: true });
		return this.filterRoles(roles, userId);
	}

	@bindThis
	public async getUserPolicies(
		userId: MiUser['id'] | null,
	): Promise<RolePolicies> {
		const meta = await this.metaService.fetch();
		const basePolicies = { ...DEFAULT_POLICIES, ...meta.policies };

		if (userId == null) return basePolicies;

		const roles = await this.getUserRoles(userId);

		const calc = <T extends keyof RolePolicies>(
			name: T,
			aggregate: (values: RolePolicies[T][]) => RolePolicies[T],
		) => {
			if (roles.length === 0) return basePolicies[name];

			const policies = roles.map((role) => {
				return role.policies[name] ?? { priority: 0, useDefault: true };
			});

			const highestPriorityPolicies = [
				...policies.reduce((prev, current) => {
					return prev.set(current.priority, [
						...(prev.get(current.priority) ?? []),
						current,
					]);
				}, new Map<number, typeof policies>()),
			].toSorted(([a], [b]) => {
				if (a < b) return +1;
				if (a > b) return -1;
				return 0;
			})[0]?.[1];
			if (highestPriorityPolicies === undefined) throw new Error();

			return aggregate(
				highestPriorityPolicies.map((policy) => {
					return policy.useDefault ? basePolicies[name] : policy.value;
				}),
			);
		};

		return {
			gtlAvailable: calc('gtlAvailable', (vs) => vs.some((v) => v)),
			ltlAvailable: calc('ltlAvailable', (vs) => vs.some((v) => v)),
			canPublicNote: calc('canPublicNote', (vs) => vs.some((v) => v)),
			canInvite: calc('canInvite', (vs) => vs.some((v) => v)),
			inviteLimit: calc('inviteLimit', (vs) => Math.max(...vs)),
			inviteLimitCycle: calc('inviteLimitCycle', (vs) => Math.max(...vs)),
			inviteExpirationTime: calc('inviteExpirationTime', (vs) =>
				Math.max(...vs),
			),
			canManageCustomEmojis: calc('canManageCustomEmojis', (vs) =>
				vs.some((v) => v),
			),
			canManageAvatarDecorations: calc('canManageAvatarDecorations', (vs) =>
				vs.some((v) => v),
			),
			canSearchNotes: calc('canSearchNotes', (vs) => vs.some((v) => v)),
			canUseTranslator: calc('canUseTranslator', (vs) => vs.some((v) => v)),
			canHideAds: calc('canHideAds', (vs) => vs.some((v) => v)),
			driveCapacityMb: calc('driveCapacityMb', (vs) => Math.max(...vs)),
			alwaysMarkNsfw: calc('alwaysMarkNsfw', (vs) => vs.some((v) => v)),
			pinLimit: calc('pinLimit', (vs) => Math.max(...vs)),
			antennaLimit: calc('antennaLimit', (vs) => Math.max(...vs)),
			wordMuteLimit: calc('wordMuteLimit', (vs) => Math.max(...vs)),
			webhookLimit: calc('webhookLimit', (vs) => Math.max(...vs)),
			clipLimit: calc('clipLimit', (vs) => Math.max(...vs)),
			noteEachClipsLimit: calc('noteEachClipsLimit', (vs) => Math.max(...vs)),
			userListLimit: calc('userListLimit', (vs) => Math.max(...vs)),
			userEachUserListsLimit: calc('userEachUserListsLimit', (vs) =>
				Math.max(...vs),
			),
			rateLimitFactor: calc('rateLimitFactor', (vs) => Math.max(...vs)),
			avatarDecorationLimit: calc('avatarDecorationLimit', (vs) =>
				Math.max(...vs),
			),
		};
	}

	@bindThis
	public async isModerator(
		user: { id: MiUser['id']; isRoot: MiUser['isRoot'] } | null,
	): Promise<boolean> {
		if (user === null) return false;
		if (user.isRoot) return true;

		const roles = await this.getUserRoles(user.id);
		return roles.some((r) => r.isModerator || r.isAdministrator);
	}

	@bindThis
	public async isAdministrator(
		user: { id: MiUser['id']; isRoot: MiUser['isRoot'] } | null,
	): Promise<boolean> {
		if (user === null) return false;
		if (user.isRoot) return true;

		const roles = await this.getUserRoles(user.id);
		return roles.some((r) => r.isAdministrator);
	}

	@bindThis
	public async addNoteToRoleTimeline(note: Packed<'Note'>): Promise<void> {
		const roles = await this.getUserRoles(note.userId);

		const redisPipeline = this.redisForTimelines.pipeline();

		for (const role of roles) {
			this.fanoutTimelineService.push(
				`roleTimeline:${role.id}`,
				note.id,
				1000,
				redisPipeline,
			);
			this.globalEventService.publishRoleTimelineStream(role.id, 'note', note);
		}

		redisPipeline.exec();
	}
}
