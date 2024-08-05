/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import Channel, { type MiChannelService } from '../channel.js';

class ReversiChannel extends Channel {
	public readonly chName = 'reversi';
	public static shouldShare = true;
	public static requireCredential = true as const;
	public static kind = 'read:account';

	public async init(params: any) {
		this.subscriber.on(`reversiStream:${this.user!.id}`, this.send);
	}

	public dispose() {
		// Unsubscribe events
		this.subscriber.off(`reversiStream:${this.user!.id}`, this.send);
	}
}

@Injectable()
export class ReversiChannelService implements MiChannelService<true> {
	public readonly shouldShare = ReversiChannel.shouldShare;
	public readonly requireCredential = ReversiChannel.requireCredential;
	public readonly kind = ReversiChannel.kind;

	public create(id: string, connection: Channel['connection']): ReversiChannel {
		return new ReversiChannel(
			id,
			connection,
		);
	}
}
