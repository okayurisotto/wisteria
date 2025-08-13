/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

class GlobalTimelineChannel extends Channel {
	public readonly chName = 'globalTimeline';
	public static override shouldShare = false;
	public static override requireCredential = false as const;

	public async init(_params: unknown) {
	}

	public override dispose() {
	}
}

@Injectable()
export class GlobalTimelineChannelService implements MiChannelService<false> {
	public readonly shouldShare = GlobalTimelineChannel.shouldShare;
	public readonly requireCredential = GlobalTimelineChannel.requireCredential;
	public readonly kind = GlobalTimelineChannel.kind;

	public create(id: string, connection: Channel['connection']): GlobalTimelineChannel {
		return new GlobalTimelineChannel(id, connection);
	}
}
