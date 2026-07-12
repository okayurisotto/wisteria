/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueueProcessorService } from '@/queue/QueueProcessorService.js';
import { QueueStatsService } from '@/daemons/QueueStatsService.js';
import { ServerService } from '@/server/ServerService.js';
import { envOption } from '@/env.js';
import type { INestApplicationContext } from '@nestjs/common';

export const server = (app: INestApplicationContext) => {
	const serverService = app.get(ServerService);
	serverService.launch();

	if (!envOption.isTest) {
		app.get(QueueStatsService).start();
	}

	return app;
};

export const jobQueue = async (app: INestApplicationContext) => {
	await app.get(QueueProcessorService).start();

	return app;
};
