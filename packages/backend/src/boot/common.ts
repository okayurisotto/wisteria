/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NestFactory } from '@nestjs/core';
import { ChartManagementService } from '@/core/chart/ChartManagementService.js';
import { QueueProcessorService } from '@/queue/QueueProcessorService.js';
import { NestLogger } from '@/NestLogger.js';
import { QueueProcessorModule } from '@/queue/QueueProcessorModule.js';
import { QueueStatsService } from '@/daemons/QueueStatsService.js';
import { ServerStatsService } from '@/daemons/ServerStatsService.js';
import { ServerService } from '@/server/ServerService.js';
import { MainModule } from '@/MainModule.js';

export const server = async () => {
	const app = await NestFactory.createApplicationContext(MainModule, {
		logger: new NestLogger(),
	});

	const serverService = app.get(ServerService);
	await serverService.launch();

	if (process.env['NODE_ENV'] !== 'test') {
		app.get(ChartManagementService).start();
		app.get(QueueStatsService).start();
		void app.get(ServerStatsService).start();
	}

	return app;
};

export const jobQueue = async () => {
	const app = await NestFactory.createApplicationContext(QueueProcessorModule, {
		logger: new NestLogger(),
	});

	await app.get(QueueProcessorService).start();
	app.get(ChartManagementService).start();

	return app;
};
