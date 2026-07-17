/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { FollowRequestsRepository, NotesRepository, MiUser, UsersRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiNotification } from '@/models/Notification.js';
import type { MiNote } from '@/models/Note.js';
import { isNotNull } from '@/misc/is-not-null.js';
import { notificationTypes } from '@/types.js';
import { RoleEntityService } from './RoleEntityService.js';
import { NoteEntityService } from './NoteEntityService.js';
import type { z } from 'zod';
import type { NoteSchema } from '@/models/zod/note.js';
import type { UserLiteSchema } from '@/models/zod/user-lite.js';
import type { NotificationSchema } from '@/models/zod/notification.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';

const NOTE_REQUIRED_NOTIFICATION_TYPES = new Set(['note', 'mention', 'reply', 'renote', 'quote', 'reaction', 'pollEnded'] as (typeof notificationTypes[number])[]);

@Injectable()
export class NotificationEntityService {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.followRequestsRepository)
		private readonly followRequestsRepository: FollowRequestsRepository,

		private readonly roleEntityService: RoleEntityService,
		private readonly noteEntityService: NoteEntityService,
		private readonly userLiteEntityService: UserLiteEntityService,
	) {}

	public async pack(
		src: MiNotification,
		meId: MiUser['id'],
		hint?: {
			packedNotes: Map<MiNote['id'], z.infer<typeof NoteSchema>>;
			packedUsers: Map<MiUser['id'], z.infer<typeof UserLiteSchema>>;
		},
	): Promise<z.infer<typeof NotificationSchema>> {
		const notification = src;
		const noteIfNeed = NOTE_REQUIRED_NOTIFICATION_TYPES.has(notification.type) && 'noteId' in notification
			? (
					hint?.packedNotes != null
						? hint.packedNotes.get(notification.noteId)
						: this.noteEntityService.pack(notification.noteId, { id: meId }, {
							detail: true,
						})
				)
			: undefined;
		const userIfNeed = 'notifierId' in notification
			? (
					hint?.packedUsers != null
						? hint.packedUsers.get(notification.notifierId)
						: this.userLiteEntityService.packLite(notification.notifierId)
				)
			: undefined;
		const role = notification.type === 'roleAssigned' ? await this.roleEntityService.pack(notification.roleId) : undefined;

		return await awaitAll({
			id: notification.id,
			createdAt: new Date(notification.createdAt).toISOString(),
			type: notification.type,
			userId: 'notifierId' in notification ? notification.notifierId : undefined,
			...(userIfNeed != null ? { user: userIfNeed } : {}),
			...(noteIfNeed != null ? { note: noteIfNeed } : {}),
			...(notification.type === 'reaction'
				? {
						reaction: notification.reaction,
					}
				: {}),
			...(notification.type === 'roleAssigned'
				? {
						role: role,
					}
				: {}),
			...(notification.type === 'app'
				? {
						body: notification.customBody,
						header: notification.customHeader,
						icon: notification.customIcon,
					}
				: {}),
		});
	}

	public async packMany(
		notifications: MiNotification[],
		meId: MiUser['id'],
	) {
		if (notifications.length === 0) return [];

		let validNotifications = notifications;

		const noteIds = validNotifications.map(x => 'noteId' in x ? x.noteId : null).filter(isNotNull);
		const notes = noteIds.length > 0
			? await this.notesRepository.find({
				where: { id: In(noteIds) },
				relations: ['user', 'reply', 'reply.user', 'renote', 'renote.user'],
			})
			: [];
		const packedNotesArray = await this.noteEntityService.packMany(notes, { id: meId }, {
			detail: true,
		});
		const packedNotes = new Map(packedNotesArray.map(p => [p.id, p]));

		validNotifications = validNotifications.filter(x => !('noteId' in x) || packedNotes.has(x.noteId));

		const userIds = validNotifications.map(x => 'notifierId' in x ? x.notifierId : null).filter(isNotNull);
		const users = userIds.length > 0
			? await this.usersRepository.find({
				where: { id: In(userIds) },
			})
			: [];
		const packedUsersArray = await Promise.all(users.map(u => this.userLiteEntityService.packLite(u)));
		const packedUsers = new Map(packedUsersArray.map(p => [p.id, p]));

		// 既に解決されたフォローリクエストの通知を除外
		const followRequestNotifications = validNotifications.filter((x) => x.type === 'receiveFollowRequest');
		if (followRequestNotifications.length > 0) {
			const reqs = await this.followRequestsRepository.find({
				where: { followerId: In(followRequestNotifications.map(x => x.notifierId)) },
			});
			validNotifications = validNotifications.filter(x => (x.type !== 'receiveFollowRequest') || reqs.some(r => r.followerId === x.notifierId));
		}

		return await Promise.all(validNotifications.map(x => this.pack(x, meId, {
			packedNotes,
			packedUsers,
		})));
	}
}
