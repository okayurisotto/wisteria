/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

class AdminChannel extends Channel {
	public readonly chName = 'admin';
	public static override shouldShare = true;
	public static override requireCredential = true as const;
	public static override kind = 'read:admin:stream';

	public async init(_params: unknown) {
		// Subscribe admin stream
		this.subscriber.on(`adminStream:${this.user?.id}`, (data: unknown) => {
			this.send(data);
		});
	}
}

@Injectable()
export class AdminChannelService implements MiChannelService<true> {
	public readonly shouldShare = AdminChannel.shouldShare;
	public readonly requireCredential = AdminChannel.requireCredential;
	public readonly kind = AdminChannel.kind;

	public create(id: string, connection: Channel['connection']): AdminChannel {
		return new AdminChannel(
			id,
			connection,
		);
	}
}
