/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { MiAntenna } from '@/models/Antenna.js';
import type { MiNote } from '@/models/Note.js';
import type { MiUser } from '@/models/User.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { AcctEntity } from '@/misc/AcctEntity.js';
import { DI } from '@/di-symbols.js';
import type { AntennasRepository, UserListMembershipsRepository } from '@/models/_.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { Config } from '@/config.js';
import type { z } from 'zod';
import type { NoteSchema } from '@/models/zod/note';
import { RiverflowService } from './RiverflowService.js';

@Injectable()
export class AntennaService implements OnApplicationShutdown {
	private antennasFetched: boolean;
	private antennas: MiAntenna[];

	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.redisForTimelines)
		private readonly redisForTimelines: Redis.Redis,

		@Inject(DI.redisForSub)
		private readonly redisForSub: Redis.Redis,

		@Inject(DI.antennasRepository)
		private readonly antennasRepository: AntennasRepository,

		@Inject(DI.userListMembershipsRepository)
		private readonly userListMembershipsRepository: UserListMembershipsRepository,

		private readonly globalEventService: GlobalEventService,
		private readonly riverflowService: RiverflowService,
	) {
		this.antennasFetched = false;
		this.antennas = [];

		this.redisForSub.on('message', this.onRedisMessage);
	}

	private readonly onRedisMessage = async (_: string, data: string): Promise<void> => {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];
			switch (type) {
				case 'antennaCreated':
					this.antennas.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
						...body,
						lastUsedAt: new Date(body.lastUsedAt),
						user: null, // joinなカラムは通常取ってこないので
						userList: null, // joinなカラムは通常取ってこないので
					});
					break;
				case 'antennaUpdated': {
					const idx = this.antennas.findIndex(a => a.id === body.id);
					if (idx >= 0) {
						this.antennas[idx] = { // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							lastUsedAt: new Date(body.lastUsedAt),
							user: null, // joinなカラムは通常取ってこないので
							userList: null, // joinなカラムは通常取ってこないので
						};
					} else {
						// サーバ起動時にactiveじゃなかった場合、リストに持っていないので追加する必要あり
						this.antennas.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							lastUsedAt: new Date(body.lastUsedAt),
							user: null, // joinなカラムは通常取ってこないので
							userList: null, // joinなカラムは通常取ってこないので
						});
					}
				}
					break;
				case 'antennaDeleted':
					this.antennas = this.antennas.filter(a => a.id !== body.id);
					break;
				default:
					break;
			}
		}
	};

	public async addNoteToAntennas(note: MiNote, noteUser: { id: MiUser['id']; username: string; host: string | null }): Promise<void> {
		const antennas = await this.getAntennas();
		const antennasWithMatchResult = await Promise.all(antennas.map(async (antenna) => {
			const hit = await this.checkHitAntenna(antenna, note, noteUser);
			return [antenna, hit] as const;
		}));
		const matchedAntennas = antennasWithMatchResult.filter(([, hit]) => hit).map(([antenna]) => antenna);

		const redisPipeline = this.redisForTimelines.pipeline();

		for (const antenna of matchedAntennas) {
			await this.riverflowService.add(`riverflow:antenna:${antenna.id}`, note.id);
			await this.riverflowService.expire(`riverflow:antenna:${antenna.id}`, 200);
			this.globalEventService.publishAntennaStream(antenna.id, 'note', note);
		}

		await redisPipeline.exec();
	}

	// NOTE: フォローしているユーザーのノート、リストのユーザーのノート、グループのユーザーのノート指定はパフォーマンス上の理由で無効になっている

	public async checkHitAntenna(antenna: MiAntenna, note: (MiNote | z.infer<typeof NoteSchema>), noteUser: { id: MiUser['id']; username: string; host: string | null }): Promise<boolean> {
		if (note.visibility === 'specified') return false;
		if (note.visibility === 'followers') return false;

		if (antenna.localOnly && noteUser.host != null) return false;

		if (!antenna.withReplies && note.replyId != null) return false;

		const noteUserAcct = AcctEntity.from(noteUser.username, noteUser.host, this.config.host);
		const antennaUserAccts = antenna.users
			.map(x => AcctEntity.parse(x, this.config.host))
			.filter(x => x !== null)
			.map(x => x);

		if (antenna.src === 'home') {
			// TODO
		} else if (antenna.src === 'list') {
			const listUsers = (await this.userListMembershipsRepository.findBy({
				userListId: antenna.userListId!,
			})).map(x => x.userId);

			if (!listUsers.includes(note.userId)) return false;
		} else if (antenna.src === 'users') {
			if (!(antennaUserAccts.some(acct => acct.is(noteUserAcct)))) return false;
		} else if (antenna.src === 'users_blacklist') {
			if (antennaUserAccts.some(acct => acct.is(noteUserAcct))) return false;
		}

		const keywords = antenna.keywords
			// Clean up
			.map(xs => xs.filter(x => x !== ''))
			.filter(xs => xs.length > 0);

		if (keywords.length > 0) {
			if (note.text == null && note.cw == null) return false;

			const _text = (note.text ?? '') + '\n' + (note.cw ?? '');

			const matched = keywords.some(and =>
				and.every(keyword =>
					antenna.caseSensitive
						? _text.includes(keyword)
						: _text.toLowerCase().includes(keyword.toLowerCase()),
				));

			if (!matched) return false;
		}

		const excludeKeywords = antenna.excludeKeywords
			// Clean up
			.map(xs => xs.filter(x => x !== ''))
			.filter(xs => xs.length > 0);

		if (excludeKeywords.length > 0) {
			if (note.text == null && note.cw == null) return false;

			const _text = (note.text ?? '') + '\n' + (note.cw ?? '');

			const matched = excludeKeywords.some(and =>
				and.every(keyword =>
					antenna.caseSensitive
						? _text.includes(keyword)
						: _text.toLowerCase().includes(keyword.toLowerCase()),
				));

			if (matched) return false;
		}

		if (antenna.withFile) {
			if (note.fileIds && note.fileIds.length === 0) return false;
		}

		// TODO: eval expression

		return true;
	}

	public async getAntennas() {
		if (!this.antennasFetched) {
			this.antennas = await this.antennasRepository.findBy({
				isActive: true,
			});
			this.antennasFetched = true;
		}

		return this.antennas;
	}

	public dispose(): void {
		this.redisForSub.off('message', this.onRedisMessage);
	}

	public onApplicationShutdown(): void {
		this.dispose();
	}
}
