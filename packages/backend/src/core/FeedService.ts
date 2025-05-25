/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { Feed } from 'feed';
import { DI } from '@/di-symbols.js';
import type { DriveFilesRepository, NotesRepository, UserProfilesRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import type { MiUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { UserLiteEntityService } from './entities/UserLiteEntityService.js';
import { DriveFilePublicUrlGetService } from './entities/DriveFilePublicUrlGetService.js';

@Injectable()
export class FeedService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
		private readonly driveFilePublicUrlGetService: DriveFilePublicUrlGetService,
	) {}

	public async packFeed(user: MiUser): Promise<Feed> {
		const author = {
			link: `${this.config.url}/@${user.username}`,
			name: user.name ?? user.username,
		};

		const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

		const notes = await this.notesRepository.find({
			where: {
				userId: user.id,
				renoteId: IsNull(),
				visibility: In(['public', 'home']),
			},
			order: { id: -1 },
			take: 20,
		});

		const latestNote = notes[0];

		const feed = new Feed({
			id: author.link,
			title: `${author.name} (${AcctEntity.from(user.username, user.host, this.config.host).toLongString()})`,
			...(latestNote ? { updated: this.idService.parse(latestNote.id).date } : {}),
			generator: 'Wisteria',
			description: `${user.notesCount} Notes, ${profile.followingVisibility === 'public' ? user.followingCount : '?'} Following, ${profile.followersVisibility === 'public' ? user.followersCount : '?'} Followers${profile.description ? ` · ${profile.description}` : ''}`,
			link: author.link,
			image: user.avatarUrl ?? this.userLiteEntityService.getIdenticonUrl(user),
			feedLinks: {
				json: `${author.link}.json`,
				atom: `${author.link}.atom`,
			},
			author,
			copyright: user.name ?? user.username,
		});

		for (const note of notes) {
			const files = note.fileIds.length > 0
				? await this.driveFilesRepository.findBy({
					id: In(note.fileIds),
				})
				: [];
			const file = files.find(file => file.type.startsWith('image/'));

			feed.addItem({
				title: `New note by ${author.name}`,
				link: `${this.config.url}/notes/${note.id}`,
				date: this.idService.parse(note.id).date,
				description: note.cw ?? undefined,
				content: note.text ?? undefined,
				image: file ? this.driveFilePublicUrlGetService.getPublicUrl(file) : undefined,
			});
		}

		return feed;
	}
}
