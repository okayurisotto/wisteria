/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Module } from '@nestjs/common';
import { ServerModule } from '@/server/ServerModule.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DaemonModule } from '@/daemons/DaemonModule.js';
import { QueueProcessorModule } from './queue/QueueProcessorModule.js';

@Module({
	imports: [
		GlobalModule,
		ServerModule,
		DaemonModule,
		QueueProcessorModule,
	],
})
export class MainModule {}
