/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

class HybridTimelineChannel extends Channel {
	public readonly chName = 'hybridTimeline';
	public static override shouldShare = false;
	public static override requireCredential = true as const;
	public static override kind = 'read:account';

	public async init(_params: unknown): Promise<void> {
	}

	public override dispose(): void {
	}
}

@Injectable()
export class HybridTimelineChannelService implements MiChannelService<true> {
	public readonly shouldShare = HybridTimelineChannel.shouldShare;
	public readonly requireCredential = HybridTimelineChannel.requireCredential;
	public readonly kind = HybridTimelineChannel.kind;

	public create(id: string, connection: Channel['connection']): HybridTimelineChannel {
		return new HybridTimelineChannel(id, connection);
	}
}
