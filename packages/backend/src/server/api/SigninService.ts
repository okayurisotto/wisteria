/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { SigninsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import type { MiLocalUser } from '@/models/User.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { SigninEntityService } from '@/core/entities/SigninEntityService.js';
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

@Injectable()
export class SigninService {
	constructor(
		@Inject(DI.signinsRepository)
		private signinsRepository: SigninsRepository,

		private signinEntityService: SigninEntityService,
		private idService: IdService,
		private globalEventService: GlobalEventService,
	) {}

	public signin(c: Context, user: MiLocalUser) {
		setImmediate(() => {
			void (async () => {
				// Append signin history
				const record = await this.signinsRepository.insert({
					id: this.idService.gen(),
					userId: user.id,
					ip: getConnInfo(c).remote.address,
					headers: c.req.header(),
					success: true,
				}).then(x => this.signinsRepository.findOneByOrFail(x.identifiers[0]));

				// Publish signin event
				this.globalEventService.publishMainStream(user.id, 'signin', await this.signinEntityService.pack(record));
			})();
		});

		return c.json({ id: user.id, i: user.token }, 200);
	}
}
