import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics } from 'prom-client';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { ApiServerMetricsService } from './ApiServerMetricsService.js';
import { QueueEventMetricsService } from './QueueEventMetricsService.js';
import { QueueCountMetricsService } from './QueueCountMetricsService.js';

@Injectable()
export class MetricsRegistryService implements OnModuleInit {
	private readonly registry;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly apiServerMetricsService: ApiServerMetricsService,
		private readonly queueCountMetricsService: QueueCountMetricsService,
		private readonly queueEventMetricsService: QueueEventMetricsService,
	) {
		this.registry = new Registry();
	}

	public onModuleInit(): void {
		if (this.config.prometheus !== undefined) {
			collectDefaultMetrics({ register: this.registry });
			this.apiServerMetricsService.register(this.registry);
			this.queueCountMetricsService.register(this.registry);
			this.queueEventMetricsService.register(this.registry);
		}
	}

	public async getAllMetrics(): Promise<string> {
		return await this.registry.metrics();
	}
}
