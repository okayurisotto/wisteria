import { Inject, Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';
import * as Bull from 'bullmq';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { baseQueueOptions, QUEUE } from '@/queue/const.js';

@Injectable()
export class QueueEventMetricsService {
	private readonly counter = new Counter({
		name: 'wisteria_job_event',
		help: 'Job queue event',
		labelNames: ['name', 'event'] as const,
		registers: [],
	});

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {
		if (this.config.prometheus !== undefined) {
			const queueEvents = [
				new Bull.QueueEvents(QUEUE.DB, baseQueueOptions(this.config, QUEUE.DB)),
				new Bull.QueueEvents(QUEUE.DELIVER, baseQueueOptions(this.config, QUEUE.DELIVER)),
				new Bull.QueueEvents(QUEUE.ENDED_POLL_NOTIFICATION, baseQueueOptions(this.config, QUEUE.ENDED_POLL_NOTIFICATION)),
				new Bull.QueueEvents(QUEUE.INBOX, baseQueueOptions(this.config, QUEUE.INBOX)),
				new Bull.QueueEvents(QUEUE.OBJECT_STORAGE, baseQueueOptions(this.config, QUEUE.OBJECT_STORAGE)),
				new Bull.QueueEvents(QUEUE.RELATIONSHIP, baseQueueOptions(this.config, QUEUE.RELATIONSHIP)),
				new Bull.QueueEvents(QUEUE.SYSTEM, baseQueueOptions(this.config, QUEUE.SYSTEM)),
				new Bull.QueueEvents(QUEUE.WEBHOOK_DELIVER, baseQueueOptions(this.config, QUEUE.WEBHOOK_DELIVER)),
			];

			const events = [
				'active',
				'added',
				'cleaned',
				'completed',
				'delayed',
				// 'drained', // キューが空になった回数を統計としてまとめたい場面が想像できない
				'duplicated',
				'error',
				'failed',
				'paused',
				// 'progress', // そもそも回数を統計としてまとめるには適さない
				'removed',
				'resumed',
				'retries-exhausted',
				'stalled',
				'waiting',
				'waiting-children',
			] as const;

			for (const queueEvent of queueEvents) {
				for (const event of events) {
					queueEvent.on(event, () => {
						this.counter.inc({ name: queueEvent.name, event }, 1);
					});
				}
			}
		}
	}

	public register(registry: Registry): void {
		registry.registerMetric(this.counter);
	}
}
