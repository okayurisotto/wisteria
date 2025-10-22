/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import Xev from 'xev';
import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

const ev = new Xev();

class QueueStatsChannel extends Channel {
	public readonly chName = 'queueStats';
	public static override shouldShare = true;
	public static override requireCredential = false as const;

	public async init() {
		ev.addListener('queueStats', this.onStats);
	}

	private readonly onStats = (stats: unknown) => {
		this.send('stats', stats);
	};

	public override onMessage(type: string, body: unknown) {
		switch (type) {
			case 'requestLog':
				ev.once(`queueStatsLog:${body.id}`, (statsLog) => {
					this.send('statsLog', statsLog);
				});
				ev.emit('requestQueueStatsLog', {
					id: body.id,
					length: body.length,
				});
				break;
		}
	}

	public override dispose() {
		ev.removeListener('queueStats', this.onStats);
	}
}

@Injectable()
export class QueueStatsChannelService implements MiChannelService<false> {
	public readonly shouldShare = QueueStatsChannel.shouldShare;
	public readonly requireCredential = QueueStatsChannel.requireCredential;
	public readonly kind = QueueStatsChannel.kind;

	public create(id: string, connection: Channel['connection']): QueueStatsChannel {
		return new QueueStatsChannel(
			id,
			connection,
		);
	}
}
