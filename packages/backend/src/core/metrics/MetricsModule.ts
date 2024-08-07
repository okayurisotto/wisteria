import { Module } from '@nestjs/common';
import { MetricsRegistryService } from './MetricsRegistryService.js';

@Module({
	providers: [MetricsRegistryService],
	exports: [MetricsRegistryService],
})
export class MetricsModule {}
