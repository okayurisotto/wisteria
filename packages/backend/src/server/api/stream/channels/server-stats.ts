/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import Xev from 'xev';
import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

const ev = new Xev();

class ServerStatsChannel extends Channel {
	public readonly chName = 'serverStats';
	public static shouldShare = true;
	public static requireCredential = false as const;

	public async init(params: any) {
		ev.addListener('serverStats', this.onStats);
	}

	private readonly onStats = (stats: any) => {
		this.send('stats', stats);
	};

	public onMessage(type: string, body: any) {
		switch (type) {
			case 'requestLog':
				ev.once(`serverStatsLog:${body.id}`, (statsLog) => {
					this.send('statsLog', statsLog);
				});
				ev.emit('requestServerStatsLog', {
					id: body.id,
					length: body.length,
				});
				break;
		}
	}

	public dispose() {
		ev.removeListener('serverStats', this.onStats);
	}
}

@Injectable()
export class ServerStatsChannelService implements MiChannelService<false> {
	public readonly shouldShare = ServerStatsChannel.shouldShare;
	public readonly requireCredential = ServerStatsChannel.requireCredential;
	public readonly kind = ServerStatsChannel.kind;

	public create(id: string, connection: Channel['connection']): ServerStatsChannel {
		return new ServerStatsChannel(
			id,
			connection,
		);
	}
}
