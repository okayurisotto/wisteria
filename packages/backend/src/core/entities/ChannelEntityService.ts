/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { ChannelFavoritesRepository, ChannelFollowingsRepository, ChannelsRepository, DriveFilesRepository, NotesRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiChannel } from '@/models/Channel.js';
import { IdService } from '@/core/IdService.js';
import { DriveFileEntityService } from './DriveFileEntityService.js';
import { NoteEntityService } from './NoteEntityService.js';
import { In } from 'typeorm';
import type { z } from 'zod';
import type { ChannelSchema } from '@/models/zod/channel.js';

@Injectable()
export class ChannelEntityService {
	constructor(
		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		@Inject(DI.channelFollowingsRepository)
		private readonly channelFollowingsRepository: ChannelFollowingsRepository,

		@Inject(DI.channelFavoritesRepository)
		private readonly channelFavoritesRepository: ChannelFavoritesRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly idService: IdService,
	) {}

	public async pack(
		src: MiChannel['id'] | MiChannel,
		me?: { id: MiUser['id'] } | null | undefined,
		detailed?: boolean,
	): Promise<z.infer<typeof ChannelSchema>> {
		const channel = typeof src === 'object' ? src : await this.channelsRepository.findOneByOrFail({ id: src });
		const meId = me ? me.id : null;

		const banner = channel.bannerId ? await this.driveFilesRepository.findOneBy({ id: channel.bannerId }) : null;

		const isFollowing = meId
			? await this.channelFollowingsRepository.exists({
				where: {
					followerId: meId,
					followeeId: channel.id,
				},
			})
			: false;

		const isFavorited = meId
			? await this.channelFavoritesRepository.exists({
				where: {
					userId: meId,
					channelId: channel.id,
				},
			})
			: false;

		const pinnedNotes = channel.pinnedNoteIds.length > 0
			? await this.notesRepository.find({
				where: {
					id: In(channel.pinnedNoteIds),
				},
			})
			: [];

		return {
			id: channel.id,
			createdAt: this.idService.parse(channel.id).date.toISOString(),
			lastNotedAt: channel.lastNotedAt ? channel.lastNotedAt.toISOString() : null,
			name: channel.name,
			description: channel.description,
			userId: channel.userId,
			bannerUrl: banner ? this.driveFileEntityService.getPublicUrl(banner) : null,
			pinnedNoteIds: channel.pinnedNoteIds,
			color: channel.color,
			isArchived: channel.isArchived,
			usersCount: channel.usersCount,
			notesCount: channel.notesCount,
			isSensitive: channel.isSensitive,
			allowRenoteToExternal: channel.allowRenoteToExternal,

			...(me ? {
				isFollowing,
				isFavorited,
				hasUnreadNote: false, // 後方互換性のため
			} : {}),

			...(detailed
				? {
						pinnedNotes: (await this.noteEntityService.packMany(pinnedNotes, me)).sort((a, b) => channel.pinnedNoteIds.indexOf(a.id) - channel.pinnedNoteIds.indexOf(b.id)),
					}
				: {}),
		};
	}
}
