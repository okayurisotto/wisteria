import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics } from 'prom-client';
import type { Config } from '@/config';
import { DI } from '@/di-symbols';

@Injectable()
export class MetricsRegistryService implements OnModuleInit {
	private readonly registry;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {
		this.registry = new Registry();
	}

	public onModuleInit(): void {
		if (this.config.prometheus !== undefined) {
			collectDefaultMetrics({ register: this.registry });
		}
	}

	public async getAllMetrics(): Promise<string> {
		return await this.registry.metrics();
	}
}
