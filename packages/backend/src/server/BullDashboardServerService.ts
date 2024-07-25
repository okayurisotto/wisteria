/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { FastifyAdapter } from '@bull-board/fastify';
import fastifyCookie from '@fastify/cookie';
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
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

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
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.register(fastifyCookie, {});

		const bullBoardPath = '/queue';

		// Authenticate
		fastify.addHook('onRequest', async (request, reply) => {
			// `request.url`は`/%71ueue`などでリクエストされたときに困るため使わない
			const url = request.routeOptions.url;

			if (url === bullBoardPath || url.startsWith(bullBoardPath + '/')) {
				const token = request.cookies['token'];
				if (token === undefined) {
					reply.code(401).send('Login required');
					return;
				}

				const user = await this.usersRepository.findOneBy({ token });
				if (user == null) {
					reply.code(403).send('No such user');
					return;
				}

				const isAdministrator =
					await this.roleUserService.isAdministrator(user);
				if (!isAdministrator) {
					reply.code(403).send('Access denied');
					return;
				}
			}
		});

		const serverAdapter = new FastifyAdapter();

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
			].map((q) => new BullMQAdapter(q)),
			serverAdapter,
		});

		serverAdapter.setBasePath(bullBoardPath);
		(fastify.register as any)(serverAdapter.registerPlugin(), {
			prefix: bullBoardPath,
		});

		done();
	}
}
