/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ChartManagementService } from '@/core/chart/ChartManagementService.js';
import { QueueProcessorService } from '@/queue/QueueProcessorService.js';
import { QueueStatsService } from '@/daemons/QueueStatsService.js';
import { ServerStatsService } from '@/daemons/ServerStatsService.js';
import { ServerService } from '@/server/ServerService.js';
import { envOption } from '@/env.js';
import { INestApplicationContext } from '@nestjs/common';

export const server = async (app: INestApplicationContext) => {
	const serverService = app.get(ServerService);
	await serverService.launch();

	if (!envOption.isTest) {
		app.get(ChartManagementService).start();
		app.get(QueueStatsService).start();
		void app.get(ServerStatsService).start();
	}

	return app;
};

export const jobQueue = async (app: INestApplicationContext) => {
	await app.get(QueueProcessorService).start();
	app.get(ChartManagementService).start();

	return app;
};
