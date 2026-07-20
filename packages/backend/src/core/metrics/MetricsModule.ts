import { Module } from '@nestjs/common';
import { MetricsRegistryService } from './MetricsRegistryService.js';
import { ApiServerMetricsService } from './ApiServerMetricsService.js';
import { QueueEventMetricsService } from './QueueEventMetricsService.js';
import { QueueCountMetricsService } from './QueueCountMetricsService.js';
import { QueueModule } from '@/core/QueueModule.js';
import { QueueService } from '@/core/QueueService.js';

@Module({
	imports: [QueueModule],
	providers: [
		MetricsRegistryService,
		ApiServerMetricsService,
		QueueEventMetricsService,
		QueueCountMetricsService,
		QueueService,
	],
	exports: [
		MetricsRegistryService,
		ApiServerMetricsService,
		QueueEventMetricsService,
		QueueCountMetricsService,
	],
})
export class MetricsModule {}
