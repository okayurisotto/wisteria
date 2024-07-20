/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import type { MiEmoji } from '@/models/Emoji.js';
import type { EmojisRepository, MiRole, MiUser } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { RedisSingleCache } from '@/misc/cache.js';
import type { Serialized } from '@/types.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';

@Injectable()
export class CustomEmojiService {
	public localEmojisCache: RedisSingleCache<Map<string, MiEmoji>>;

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.emojisRepository)
		private emojisRepository: EmojisRepository,

		private idService: IdService,
		private emojiEntityService: EmojiEntityService,
		private moderationLogService: ModerationLogService,
		private globalEventService: GlobalEventService,
	) {
		this.localEmojisCache = new RedisSingleCache<Map<string, MiEmoji>>(this.redisClient, 'localEmojis', {
			lifetime: 1000 * 60 * 30, // 30m
			memoryCacheLifetime: 1000 * 60 * 3, // 3m
			fetcher: () => this.emojisRepository.find({ where: { host: IsNull() } }).then(emojis => new Map(emojis.map(emoji => [emoji.name, emoji]))),
			toRedisConverter: (value) => JSON.stringify(Array.from(value.values())),
			fromRedisConverter: (value) => {
				return new Map(JSON.parse(value).map((x: Serialized<MiEmoji>) => [x.name, {
					...x,
					updatedAt: x.updatedAt ? new Date(x.updatedAt) : null,
				}]));
			},
		});
	}

	@bindThis
	public async add(data: {
		driveFile: MiDriveFile;
		name: string;
		category: string | null;
		aliases: string[];
		host: string | null;
		license: string | null;
		isSensitive: boolean;
		localOnly: boolean;
		roleIdsThatCanBeUsedThisEmojiAsReaction: MiRole['id'][];
	}, moderator?: MiUser): Promise<MiEmoji> {
		const emoji = await this.emojisRepository.insert({
			id: this.idService.gen(),
			updatedAt: new Date(),
			name: data.name,
			category: data.category,
			host: data.host,
			aliases: data.aliases,
			originalUrl: data.driveFile.url,
			publicUrl: data.driveFile.webpublicUrl ?? data.driveFile.url,
			type: data.driveFile.webpublicType ?? data.driveFile.type,
			license: data.license,
			isSensitive: data.isSensitive,
			localOnly: data.localOnly,
			roleIdsThatCanBeUsedThisEmojiAsReaction: data.roleIdsThatCanBeUsedThisEmojiAsReaction,
		}).then(x => this.emojisRepository.findOneByOrFail(x.identifiers[0]));

		if (data.host == null) {
			this.localEmojisCache.refresh();

			this.globalEventService.publishBroadcastStream('emojiAdded', {
				emoji: await this.emojiEntityService.packDetailed(emoji.id),
			});

			if (moderator) {
				this.moderationLogService.log(moderator, 'addCustomEmoji', {
					emojiId: emoji.id,
					emoji: emoji,
				});
			}
		}

		return emoji;
	}

	@bindThis
	public async update(id: MiEmoji['id'], data: {
		driveFile?: MiDriveFile;
		name?: string;
		category?: string | null;
		aliases?: string[];
		license?: string | null;
		isSensitive?: boolean;
		localOnly?: boolean;
		roleIdsThatCanBeUsedThisEmojiAsReaction?: MiRole['id'][];
	}, moderator?: MiUser): Promise<void> {
		const emoji = await this.emojisRepository.findOneByOrFail({ id: id });
		const sameNameEmoji = await this.emojisRepository.findOneBy({ name: data.name, host: IsNull() });
		if (sameNameEmoji != null && sameNameEmoji.id !== id) throw new Error('name already exists');

		await this.emojisRepository.update(emoji.id, {
			updatedAt: new Date(),
			name: data.name,
			category: data.category,
			aliases: data.aliases,
			license: data.license,
			isSensitive: data.isSensitive,
			localOnly: data.localOnly,
			originalUrl: data.driveFile != null ? data.driveFile.url : undefined,
			publicUrl: data.driveFile != null ? (data.driveFile.webpublicUrl ?? data.driveFile.url) : undefined,
			type: data.driveFile != null ? (data.driveFile.webpublicType ?? data.driveFile.type) : undefined,
			roleIdsThatCanBeUsedThisEmojiAsReaction: data.roleIdsThatCanBeUsedThisEmojiAsReaction ?? undefined,
		});

		this.localEmojisCache.refresh();

		const packed = await this.emojiEntityService.packDetailed(emoji.id);

		if (emoji.name === data.name) {
			this.globalEventService.publishBroadcastStream('emojiUpdated', {
				emojis: [packed],
			});
		} else {
			this.globalEventService.publishBroadcastStream('emojiDeleted', {
				emojis: [await this.emojiEntityService.packDetailed(emoji)],
			});

			this.globalEventService.publishBroadcastStream('emojiAdded', {
				emoji: packed,
			});
		}

		if (moderator) {
			const updated = await this.emojisRepository.findOneByOrFail({ id: id });
			this.moderationLogService.log(moderator, 'updateCustomEmoji', {
				emojiId: emoji.id,
				before: emoji,
				after: updated,
			});
		}
	}

	@bindThis
	public async setCategoryBulk(ids: MiEmoji['id'][], category: string | null) {
		await this.emojisRepository.update({
			id: In(ids),
		}, {
			updatedAt: new Date(),
			category: category,
		});

		this.localEmojisCache.refresh();

		this.globalEventService.publishBroadcastStream('emojiUpdated', {
			emojis: await this.emojiEntityService.packDetailedMany(ids),
		});
	}

	@bindThis
	public async setLicenseBulk(ids: MiEmoji['id'][], license: string | null) {
		await this.emojisRepository.update({
			id: In(ids),
		}, {
			updatedAt: new Date(),
			license: license,
		});

		this.localEmojisCache.refresh();

		this.globalEventService.publishBroadcastStream('emojiUpdated', {
			emojis: await this.emojiEntityService.packDetailedMany(ids),
		});
	}

	@bindThis
	public async delete(id: MiEmoji['id'], moderator?: MiUser) {
		const emoji = await this.emojisRepository.findOneByOrFail({ id: id });

		await this.emojisRepository.delete(emoji.id);

		this.localEmojisCache.refresh();

		this.globalEventService.publishBroadcastStream('emojiDeleted', {
			emojis: [await this.emojiEntityService.packDetailed(emoji)],
		});

		if (moderator) {
			this.moderationLogService.log(moderator, 'deleteCustomEmoji', {
				emojiId: emoji.id,
				emoji: emoji,
			});
		}
	}

	@bindThis
	public async deleteBulk(ids: MiEmoji['id'][], moderator?: MiUser) {
		const emojis = await this.emojisRepository.findBy({
			id: In(ids),
		});

		for (const emoji of emojis) {
			await this.emojisRepository.delete(emoji.id);

			if (moderator) {
				this.moderationLogService.log(moderator, 'deleteCustomEmoji', {
					emojiId: emoji.id,
					emoji: emoji,
				});
			}
		}

		this.localEmojisCache.refresh();

		this.globalEventService.publishBroadcastStream('emojiDeleted', {
			emojis: await this.emojiEntityService.packDetailedMany(emojis),
		});
	}
}
