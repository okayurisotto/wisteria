import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Gauge, Registry } from 'prom-client';
import type { Config } from '@/config';
import { DI } from '@/di-symbols';
import { QueueService } from '../QueueService';

const interval = 10 * 1000;

@Injectable()
export class QueueCountMetricsService implements OnModuleDestroy {
	private readonly gauge = new Gauge({
		name: 'wisteria_job_count',
		help: 'Job queue count',
		labelNames: ['name', 'status'] as const,
		registers: [],
	});

	private readonly timer;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly queueService: QueueService,
	) {
		if (this.config.prometheus !== undefined) {
			const queues = [
				this.queueService.systemQueue,
				this.queueService.endedPollNotificationQueue,
				this.queueService.deliverQueue,
				this.queueService.inboxQueue,
				this.queueService.dbQueue,
				this.queueService.relationshipQueue,
				this.queueService.objectStorageQueue,
				this.queueService.webhookDeliverQueue,
			];

			const tick = async () => {
				await Promise.all(
					queues.map(q => [
						q.getActiveCount().then((n) => {
							this.gauge.set({ name: q.name, status: 'active' }, n);
						}),
						q.getDelayedCount().then((n) => {
							this.gauge.set({ name: q.name, status: 'delayed' }, n);
						}),
						q.getWaitingCount().then((n) => {
							this.gauge.set({ name: q.name, status: 'waiting' }, n);
						}),
					]).flat(),
				);
			};

			this.timer = setInterval(() => {
				void tick();
			}, interval);
		}
	}

	public register(registry: Registry): void {
		registry.registerMetric(this.gauge);
	}

	public onModuleDestroy() {
		if (this.timer) {
			clearInterval(this.timer);
		}
	}
}
