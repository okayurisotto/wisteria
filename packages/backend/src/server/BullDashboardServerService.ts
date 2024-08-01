/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Hono, type MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { serveStatic } from '@hono/node-server/serve-static';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { HonoAdapter } from '@bull-board/hono';
import { DI } from '@/di-symbols.js';
import type {
	DbQueue,
	DeliverQueue,
	EndedPollNotificationQueue,
	InboxQueue,
	ObjectStorageQueue,
	RelationshipQueue,
	SystemQueue,
	WebhookDeliverQueue,
} from '@/core/QueueModule.js';
import type { UsersRepository } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { RoleUserService } from '@/core/RoleUserService.js';

@Injectable()
export class BullDashboardServerService {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject('queue:system')
		private readonly systemQueue: SystemQueue,
		@Inject('queue:endedPollNotification')
		private readonly endedPollNotificationQueue: EndedPollNotificationQueue,
		@Inject('queue:deliver')
		private readonly deliverQueue: DeliverQueue,
		@Inject('queue:inbox')
		private readonly inboxQueue: InboxQueue,
		@Inject('queue:db')
		private readonly dbQueue: DbQueue,
		@Inject('queue:objectStorage')
		private readonly objectStorageQueue: ObjectStorageQueue,
		@Inject('queue:webhookDeliver')
		private readonly webhookDeliverQueue: WebhookDeliverQueue,
		@Inject('queue:relationship')
		private readonly relationshipQueue: RelationshipQueue,

		private readonly roleUserService: RoleUserService,
	) {}

	@bindThis
	public createServer(): Hono {
		const bullBoardPath = '/queue';

		const hono = new Hono();

		const authenticate: MiddlewareHandler = async (c, next) => {
			const token = getCookie(c, 'token');
			if (token === undefined) return c.text('Login required', 401);

			const user = await this.usersRepository.findOneBy({ token });
			if (user === null) return c.text('No such user', 403);

			const isAdministrator = await this.roleUserService.isAdministrator(user);
			if (!isAdministrator) return c.text('Access denied', 403);

			await next();
			return;
		};

		const serverAdapter = new HonoAdapter(serveStatic);

		createBullBoard({
			queues: [
				this.systemQueue,
				this.endedPollNotificationQueue,
				this.deliverQueue,
				this.inboxQueue,
				this.dbQueue,
				this.objectStorageQueue,
				this.webhookDeliverQueue,
				this.relationshipQueue,
			].map(q => new BullMQAdapter(q)),
			serverAdapter,
		});

		serverAdapter.setBasePath(bullBoardPath);

		return hono.use(authenticate).route('/', serverAdapter.registerPlugin());
	}
}
