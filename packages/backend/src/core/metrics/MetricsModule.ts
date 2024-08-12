import { Module } from '@nestjs/common';
import { MetricsRegistryService } from './MetricsRegistryService.js';
import { ApiServerMetricsService } from './ApiServerMetricsService.js';

@Module({
	providers: [MetricsRegistryService, ApiServerMetricsService],
	exports: [MetricsRegistryService, ApiServerMetricsService],
})
export class MetricsModule {}
