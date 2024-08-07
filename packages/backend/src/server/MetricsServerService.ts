import { Inject, Injectable } from '@nestjs/common';
import { MetricsRegistryService } from '@/core/metrics/MetricsRegistryService.js';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';

@Injectable()
export class MetricsServerService {
	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly metricsRegistryService: MetricsRegistryService,
	) {}

	public createServer(): Hono {
		if (this.config.prometheus === undefined) return new Hono();

		return new Hono()
			.use(
				basicAuth({
					username: this.config.prometheus.basicAuth.username,
					password: this.config.prometheus.basicAuth.password,
				}),
			)
			.get('/', async (c) => {
				return c.text(await this.metricsRegistryService.getAllMetrics());
			});
	}
}
