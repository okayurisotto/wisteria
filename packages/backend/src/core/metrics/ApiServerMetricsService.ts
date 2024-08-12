import { Injectable } from '@nestjs/common';
import { Counter, Registry, Summary } from 'prom-client';

@Injectable()
export class ApiServerMetricsService {
	private readonly counter = new Counter({
		name: 'wisteria_api_count',
		help: 'API call count',
		labelNames: ['method', 'endpoint', 'status'] as const,
		registers: [],
	});

	private readonly summary = new Summary({
		name: 'wisteria_api_time',
		help: 'API processing time',
		labelNames: ['endpoint'] as const,
		registers: [],
	});

	public register(registry: Registry): void {
		registry.registerMetric(this.counter);
		registry.registerMetric(this.summary);
	}

	public onCalled(
		method: string,
		endpoint: string,
		status: number,
		duration: number,
	): void {
		this.counter.inc({ method, endpoint, status }, 1);
		this.summary.observe({ endpoint }, duration);
	}
}
