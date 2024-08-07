/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { HybridTimelineChannelService } from './channels/hybrid-timeline.js';
import { LocalTimelineChannelService } from './channels/local-timeline.js';
import { HomeTimelineChannelService } from './channels/home-timeline.js';
import { GlobalTimelineChannelService } from './channels/global-timeline.js';
import { MainChannelService } from './channels/main.js';
import { ChannelChannelService } from './channels/channel.js';
import { AdminChannelService } from './channels/admin.js';
import { ServerStatsChannelService } from './channels/server-stats.js';
import { QueueStatsChannelService } from './channels/queue-stats.js';
import { UserListChannelService } from './channels/user-list.js';
import { AntennaChannelService } from './channels/antenna.js';
import { DriveChannelService } from './channels/drive.js';
import { HashtagChannelService } from './channels/hashtag.js';
import { RoleTimelineChannelService } from './channels/role-timeline.js';
import { ReversiChannelService } from './channels/reversi.js';
import { ReversiGameChannelService } from './channels/reversi-game.js';
import type { MiChannelService } from './channel.js';

@Injectable()
export class ChannelsService {
	constructor(
		private readonly mainChannelService: MainChannelService,
		private readonly homeTimelineChannelService: HomeTimelineChannelService,
		private readonly localTimelineChannelService: LocalTimelineChannelService,
		private readonly hybridTimelineChannelService: HybridTimelineChannelService,
		private readonly globalTimelineChannelService: GlobalTimelineChannelService,
		private readonly userListChannelService: UserListChannelService,
		private readonly hashtagChannelService: HashtagChannelService,
		private readonly roleTimelineChannelService: RoleTimelineChannelService,
		private readonly antennaChannelService: AntennaChannelService,
		private readonly channelChannelService: ChannelChannelService,
		private readonly driveChannelService: DriveChannelService,
		private readonly serverStatsChannelService: ServerStatsChannelService,
		private readonly queueStatsChannelService: QueueStatsChannelService,
		private readonly adminChannelService: AdminChannelService,
		private readonly reversiChannelService: ReversiChannelService,
		private readonly reversiGameChannelService: ReversiGameChannelService,
	) {}

	public getChannelService(name: string): MiChannelService<boolean> {
		switch (name) {
			case 'main': return this.mainChannelService;
			case 'homeTimeline': return this.homeTimelineChannelService;
			case 'localTimeline': return this.localTimelineChannelService;
			case 'hybridTimeline': return this.hybridTimelineChannelService;
			case 'globalTimeline': return this.globalTimelineChannelService;
			case 'userList': return this.userListChannelService;
			case 'hashtag': return this.hashtagChannelService;
			case 'roleTimeline': return this.roleTimelineChannelService;
			case 'antenna': return this.antennaChannelService;
			case 'channel': return this.channelChannelService;
			case 'drive': return this.driveChannelService;
			case 'serverStats': return this.serverStatsChannelService;
			case 'queueStats': return this.queueStatsChannelService;
			case 'admin': return this.adminChannelService;
			case 'reversi': return this.reversiChannelService;
			case 'reversiGame': return this.reversiGameChannelService;

			default:
				throw new Error(`no such channel: ${name}`);
		}
	}
}
