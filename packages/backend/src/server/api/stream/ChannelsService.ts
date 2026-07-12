/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { HomeTimelineChannelService } from './channels/home-timeline.js';
import { MainChannelService } from './channels/main.js';
import { ChannelChannelService } from './channels/channel.js';
import { AdminChannelService } from './channels/admin.js';
import { QueueStatsChannelService } from './channels/queue-stats.js';
import { UserListChannelService } from './channels/user-list.js';
import { AntennaChannelService } from './channels/antenna.js';
import { DriveChannelService } from './channels/drive.js';
import { HashtagChannelService } from './channels/hashtag.js';
import { RoleTimelineChannelService } from './channels/role-timeline.js';
import type { MiChannelService } from './channel.js';

@Injectable()
export class ChannelsService {
	constructor(
		private readonly mainChannelService: MainChannelService,
		private readonly homeTimelineChannelService: HomeTimelineChannelService,
		private readonly userListChannelService: UserListChannelService,
		private readonly hashtagChannelService: HashtagChannelService,
		private readonly roleTimelineChannelService: RoleTimelineChannelService,
		private readonly antennaChannelService: AntennaChannelService,
		private readonly channelChannelService: ChannelChannelService,
		private readonly driveChannelService: DriveChannelService,
		private readonly queueStatsChannelService: QueueStatsChannelService,
		private readonly adminChannelService: AdminChannelService,
	) {}

	public getChannelService(name: string): MiChannelService<boolean> {
		switch (name) {
			case 'main': return this.mainChannelService;
			case 'homeTimeline': return this.homeTimelineChannelService;
			case 'userList': return this.userListChannelService;
			case 'hashtag': return this.hashtagChannelService;
			case 'roleTimeline': return this.roleTimelineChannelService;
			case 'antenna': return this.antennaChannelService;
			case 'channel': return this.channelChannelService;
			case 'drive': return this.driveChannelService;
			case 'queueStats': return this.queueStatsChannelService;
			case 'admin': return this.adminChannelService;

			default:
				throw new Error(`no such channel: ${name}`);
		}
	}
}
