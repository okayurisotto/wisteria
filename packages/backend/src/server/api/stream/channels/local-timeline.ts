/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { type MiChannelService, Channel } from '../channel.js';

class LocalTimelineChannel extends Channel {
	public readonly chName = 'localTimeline';
	public static override shouldShare = false;
	public static override requireCredential = false as const;

	public async init(_params: unknown) {
	}

	public override dispose() {
	}
}

@Injectable()
export class LocalTimelineChannelService implements MiChannelService<false> {
	public readonly shouldShare = LocalTimelineChannel.shouldShare;
	public readonly requireCredential = LocalTimelineChannel.requireCredential;
	public readonly kind = LocalTimelineChannel.kind;

	public create(id: string, connection: Channel['connection']): LocalTimelineChannel {
		return new LocalTimelineChannel(id, connection);
	}
}
