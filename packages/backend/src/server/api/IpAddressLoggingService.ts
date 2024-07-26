import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';
import type { UserIpsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';

@Injectable()
export class IpAddressLoggingService implements OnApplicationShutdown {
	private readonly userIpHistories = new Map<MiUser['id'], Set<string>>();
	private readonly userIpHistoriesClearIntervalId: NodeJS.Timeout;

	public constructor(
		@Inject(DI.userIpsRepository)
		private readonly userIpsRepository: UserIpsRepository,

		private readonly metaService: MetaService,
	) {
		this.userIpHistoriesClearIntervalId = setInterval(
			() => {
				this.userIpHistories.clear();
			},
			1000 * 60 * 60,
		);
	}

	public async log(ip: string, user: MiUser): Promise<void> {
		const meta = await this.metaService.fetch();
		if (!meta.enableIpLogging) return;

		const addresses = this.userIpHistories.get(user.id);
		if (addresses?.has(ip)) return;

		if (addresses === undefined) {
			this.userIpHistories.set(user.id, new Set([ip]));
		} else {
			addresses.add(ip);
		}

		try {
			await this.userIpsRepository
				.createQueryBuilder()
				.insert()
				.values({
					createdAt: new Date(),
					userId: user.id,
					ip: ip,
				})
				.orIgnore(true)
				.execute();
		} catch {
			/* empty */
		}
	}

	public onApplicationShutdown(): void {
		clearInterval(this.userIpHistoriesClearIntervalId);
	}
}
