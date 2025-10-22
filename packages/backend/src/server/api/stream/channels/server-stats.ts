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
	public static override shouldShare = true;
	public static override requireCredential = false as const;

	public async init() {
		ev.addListener('serverStats', this.onStats);
	}

	private readonly onStats = (stats: unknown) => {
		this.send('stats', stats);
	};

	public override onMessage(type: string, body: unknown) {
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

	public override dispose() {
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
