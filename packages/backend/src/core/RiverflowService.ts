import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';

export type RiverName =
	| `riverflow:antenna:${string}`
	| `riverflow:role:${string}`
	;

@Injectable()
export class RiverflowService {
	constructor(
		@Inject(DI.redisForTimelines)
		private readonly redisForTimelines: Redis.Redis,

		private readonly idService: IdService,
	) {}

	public async exists(name: RiverName): Promise<boolean> {
		return await this.redisForTimelines.exists(name) !== 0;
	}

	public async add(name: RiverName, id: string): Promise<void> {
		await this.addBulk(name, [id]);
	}

	public async addBulk(name: RiverName, ids: string[]): Promise<void> {
		await this.redisForTimelines.zadd(
			name,
			...ids.flatMap(id => [this.idService.parse(id).date.getTime(), id]),
		);
	}

	public async delete(name: RiverName, id: string): Promise<void> {
		await this.deleteBulk(name, [id]);
	}

	public async deleteBulk(name: RiverName, ids: string[]): Promise<void> {
		await this.redisForTimelines.zrem(name, ...ids);
	}

	public async expire(name: RiverName, count: number): Promise<void> {
		await this.redisForTimelines.zremrangebyrank(name, 0, -count - 1);
	}

	public async list(
		name: RiverName,
		since: string | number | null, until: string | number | null,
		offset?: number | null, count?: number | null,
	): Promise<string[]> {
		const since_ = typeof since === 'string'
			? this.idService.parse(since).date.getTime()
			: typeof since === 'number'
				? since
				: '-inf';

		const until_ = typeof until === 'string'
			? this.idService.parse(until).date.getTime()
			: typeof until === 'number'
				? until
				: '+inf';

		const offset_ = offset ?? 0;

		const count_ = count ?? -1;

		if (until === null && since !== null) {
			return await this.redisForTimelines.zrangebyscore(name, since_, until_, 'LIMIT', offset_, count_);
		} else {
			return await this.redisForTimelines.zrevrangebyscore(name, until_, since_, 'LIMIT', offset_, count_);
		}
	}
}
