/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as WebSocket from 'ws';
import type { MiUser } from '@/models/User.js';
import type { MiAccessToken } from '@/models/AccessToken.js';
import type { Packed } from '@/misc/json-schema.js';
import type { NoteReadService } from '@/core/NoteReadService.js';
import type { NotificationService } from '@/core/NotificationService.js';
import { bindThis } from '@/decorators.js';
import type { BlockingsRepository, ChannelFollowingsRepository, FollowingsRepository, MiFollowing, MiUserProfile, MutingsRepository, RenoteMutingsRepository, UserProfilesRepository } from '@/models/_.js';
import type { StreamEventEmitter, GlobalEvents } from '@/core/GlobalEventService.js';
import type { ChannelsService } from './ChannelsService.js';
import type { EventEmitter } from 'events';
import type Channel from './channel.js';

/**
 * Main stream connection
 */
export default class Connection {
	public readonly user?: MiUser;
	public readonly token?: MiAccessToken;
	private wsConnection: WebSocket.WebSocket;
	public subscriber: StreamEventEmitter;
	private channels: Channel[] = [];
	private subscribingNotes: any = {};
	private cachedNotes: Packed<'Note'>[] = [];
	public userProfile: MiUserProfile | null = null;
	public following: Record<string, Pick<MiFollowing, 'withReplies'> | undefined> = {};
	public followingChannels: Set<string> = new Set();
	public userIdsWhoMeMuting: Set<string> = new Set();
	public userIdsWhoBlockingMe: Set<string> = new Set();
	public userIdsWhoMeMutingRenotes: Set<string> = new Set();
	public userMutedInstances: Set<string> = new Set();
	private fetchIntervalId: NodeJS.Timeout | null = null;

	constructor(
		private userProfilesRepository: UserProfilesRepository,
		private mutingsRepository: MutingsRepository,
		private blockingsRepository: BlockingsRepository,
		private renoteMutingsRepository: RenoteMutingsRepository,
		private followingsRepository: FollowingsRepository,
		private channelFollowingsRepository: ChannelFollowingsRepository,
		private channelsService: ChannelsService,
		private noteReadService: NoteReadService,
		private notificationService: NotificationService,

		user: MiUser | null | undefined,
		token: MiAccessToken | null | undefined,
	) {
		if (user) this.user = user;
		if (token) this.token = token;
	}

	private async fetch() {
		if (this.user == null) return;

		const [
			userProfile,
			following,
			followingChannels,
			userIdsWhoMeMuting,
			userIdsWhoBlockingMe,
			userIdsWhoMeMutingRenotes,
		] = await Promise.all([
			this.userProfilesRepository.findOneByOrFail({ userId: this.user.id }),
			(this.followingsRepository.find({
				where: { followerId: this.user.id },
				select: ['followeeId', 'withReplies'],
			}).then(xs => {
				const obj: Record<string, Pick<MiFollowing, 'withReplies'> | undefined> = {};
				for (const x of xs) {
					obj[x.followeeId] = { withReplies: x.withReplies };
				}
				return obj;
			})),
			this.channelFollowingsRepository.find({ where: { followerId: this.user.id }, select: ['followeeId'] }).then(xs => new Set(xs.map(x => x.followeeId))),
			this.mutingsRepository.find({ where: { muterId: this.user.id }, select: ['muteeId'] }).then(xs => new Set(xs.map(x => x.muteeId))),
			this.blockingsRepository.find({ where: { blockeeId: this.user.id }, select: ['blockerId'] }).then(xs => new Set(xs.map(x => x.blockerId))),
			this.renoteMutingsRepository.find({ where: { muterId: this.user.id }, select: ['muteeId'] }).then(xs => new Set(xs.map(x => x.muteeId))),
		]);
		this.userProfile = userProfile;
		this.following = following;
		this.followingChannels = followingChannels;
		this.userIdsWhoMeMuting = userIdsWhoMeMuting;
		this.userIdsWhoBlockingMe = userIdsWhoBlockingMe;
		this.userIdsWhoMeMutingRenotes = userIdsWhoMeMutingRenotes;
		this.userMutedInstances = new Set(userProfile.mutedInstances);
	}

	public async init() {
		if (this.user != null) {
			await this.fetch();

			if (!this.fetchIntervalId) {
				this.fetchIntervalId = setInterval(() => {
					void this.fetch();
				}, 1000 * 10);
			}
		}
	}

	@bindThis
	public async listen(subscriber: EventEmitter, wsConnection: WebSocket.WebSocket) {
		this.subscriber = subscriber;

		this.wsConnection = wsConnection;
		this.wsConnection.on('message', this.onWsConnectionMessage);

		this.subscriber.on('broadcast', data => {
			this.onBroadcastMessage(data);
		});
	}

	/**
	 * クライアントからメッセージ受信時
	 */
	@bindThis
	private async onWsConnectionMessage(data: WebSocket.RawData) {
		let obj: Record<string, any>;

		try {
			obj = JSON.parse(data.toString());
		} catch (e) {
			return;
		}

		const { type, body } = obj;

		switch (type) {
			case 'readNotification': this.onReadNotification(body); break;
			case 'subNote': this.onSubscribeNote(body); break;
			case 's': this.onSubscribeNote(body); break; // alias
			case 'sr': this.onSubscribeNote(body); this.readNote(body); break;
			case 'unsubNote': this.onUnsubscribeNote(body); break;
			case 'un': this.onUnsubscribeNote(body); break; // alias
			case 'connect': this.onChannelConnectRequested(body); break;
			case 'disconnect': this.onChannelDisconnectRequested(body); break;
			case 'channel': this.onChannelMessageRequested(body); break;
			case 'ch': this.onChannelMessageRequested(body); break; // alias
		}
	}

	@bindThis
	private onBroadcastMessage(data: GlobalEvents['broadcast']['payload']) {
		this.sendMessageToWs(data.type, data.body);
	}

	@bindThis
	public cacheNote(note: Packed<'Note'>) {
		const add = (note: Packed<'Note'>) => {
			const existIndex = this.cachedNotes.findIndex(n => n.id === note.id);
			if (existIndex > -1) {
				this.cachedNotes[existIndex] = note;
				return;
			}

			this.cachedNotes.unshift(note);
			if (this.cachedNotes.length > 32) {
				this.cachedNotes.splice(32);
			}
		};

		add(note);
		if (note.reply) add(note.reply);
		if (note.renote) add(note.renote);
	}

	@bindThis
	private readNote(body: any) {
		const id = body.id;

		const note = this.cachedNotes.find(n => n.id === id);
		if (note == null) return;

		if (this.user && (note.userId !== this.user.id)) {
			this.noteReadService.read(this.user.id, [note]);
		}
	}

	@bindThis
	private onReadNotification(payload: any) {
		this.notificationService.readAllNotification(this.user!.id);
	}

	/**
	 * 投稿購読要求時
	 */
	@bindThis
	private onSubscribeNote(payload: any) {
		if (!payload.id) return;

		if (this.subscribingNotes[payload.id] == null) {
			this.subscribingNotes[payload.id] = 0;
		}

		this.subscribingNotes[payload.id]++;

		if (this.subscribingNotes[payload.id] === 1) {
			this.subscriber.on(`noteStream:${payload.id}`, this.onNoteStreamMessage);
		}
	}

	/**
	 * 投稿購読解除要求時
	 */
	@bindThis
	private onUnsubscribeNote(payload: any) {
		if (!payload.id) return;

		this.subscribingNotes[payload.id]--;
		if (this.subscribingNotes[payload.id] <= 0) {
			delete this.subscribingNotes[payload.id];
			this.subscriber.off(`noteStream:${payload.id}`, this.onNoteStreamMessage);
		}
	}

	@bindThis
	private async onNoteStreamMessage(data: GlobalEvents['note']['payload']) {
		this.sendMessageToWs('noteUpdated', {
			id: data.body.id,
			type: data.type,
			body: data.body.body,
		});
	}

	/**
	 * チャンネル接続要求時
	 */
	@bindThis
	private onChannelConnectRequested(payload: any) {
		const { channel, id, params, pong } = payload;
		this.connectChannel(id, params, channel, pong);
	}

	/**
	 * チャンネル切断要求時
	 */
	@bindThis
	private onChannelDisconnectRequested(payload: any) {
		const { id } = payload;
		this.disconnectChannel(id);
	}

	/**
	 * クライアントにメッセージ送信
	 */
	@bindThis
	public sendMessageToWs(type: string, payload: any) {
		this.wsConnection.send(JSON.stringify({
			type: type,
			body: payload,
		}));
	}

	/**
	 * チャンネルに接続
	 */
	@bindThis
	public connectChannel(id: string, params: any, channel: string, pong = false) {
		const channelService = this.channelsService.getChannelService(channel);

		if (channelService.requireCredential && this.user == null) {
			return;
		}

		if (this.token && ((channelService.kind && !this.token.permission.some(p => p === channelService.kind))
			|| (!channelService.kind && channelService.requireCredential))) {
			return;
		}

		// 共有可能チャンネルに接続しようとしていて、かつそのチャンネルに既に接続していたら無意味なので無視
		if (channelService.shouldShare && this.channels.some(c => c.chName === channel)) {
			return;
		}

		const ch: Channel = channelService.create(id, this);
		this.channels.push(ch);
		ch.init(params ?? {});

		if (pong) {
			this.sendMessageToWs('connected', {
				id: id,
			});
		}
	}

	/**
	 * チャンネルから切断
	 * @param id チャンネルコネクションID
	 */
	@bindThis
	public disconnectChannel(id: string) {
		const channel = this.channels.find(c => c.id === id);

		if (channel) {
			if (channel.dispose) channel.dispose();
			this.channels = this.channels.filter(c => c.id !== id);
		}
	}

	/**
	 * チャンネルへメッセージ送信要求時
	 * @param data メッセージ
	 */
	@bindThis
	private onChannelMessageRequested(data: any) {
		const channel = this.channels.find(c => c.id === data.id);
		if (channel != null && channel.onMessage != null) {
			channel.onMessage(data.type, data.body);
		}
	}

	/**
	 * ストリームが切れたとき
	 */
	@bindThis
	public dispose() {
		if (this.fetchIntervalId) clearInterval(this.fetchIntervalId);
		for (const c of this.channels.filter(c => c.dispose)) {
			if (c.dispose) c.dispose();
		}
	}
}
