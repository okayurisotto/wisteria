import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { ChannelFollowingsRepository } from '@/models/_.js';
import { MiChannel } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { bindThis } from '@/decorators.js';
import type { MiLocalUser } from '@/models/User.js';

@Injectable()
export class ChannelFollowingService {
	constructor(
		@Inject(DI.channelFollowingsRepository)
		private channelFollowingsRepository: ChannelFollowingsRepository,

		private idService: IdService,
		private globalEventService: GlobalEventService,
	) {}

	@bindThis
	public async follow(
		requestUser: MiLocalUser,
		targetChannel: MiChannel,
	): Promise<void> {
		await this.channelFollowingsRepository.insert({
			id: this.idService.gen(),
			followerId: requestUser.id,
			followeeId: targetChannel.id,
		});
	}

	@bindThis
	public async unfollow(
		requestUser: MiLocalUser,
		targetChannel: MiChannel,
	): Promise<void> {
		await this.channelFollowingsRepository.delete({
			followerId: requestUser.id,
			followeeId: targetChannel.id,
		});
	}
}
