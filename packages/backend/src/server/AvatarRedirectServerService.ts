/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IsNull } from 'typeorm';
import { AcctEntity } from '@/misc/AcctEntity.js';
import type { UsersRepository } from '@/models/_.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

@Injectable()
export class AvatarRedirectServerService {
	private readonly fallbackUrl;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly userEntityService: UserEntityService,
	) {
		this.fallbackUrl = new URL(
			'/static-assets/user-unknown.png',
			this.config.url,
		).href;
	}

	private async getAvatarUrl(
		username: string,
		host: string,
	): Promise<string | null> {
		const acct = AcctEntity.parse(username, host);
		if (acct === null) return null;

		const user = await this.usersRepository.findOne({
			where: {
				usernameLower: acct.username.toLowerCase(),
				host: acct.host ?? IsNull(),
				isSuspended: false,
			},
		});
		if (user === null) return null;

		if (user.avatarUrl !== null) return user.avatarUrl;
		return this.userEntityService.getIdenticonUrl(user);
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.get<{ Params: { acct: string } }>(
			'/avatar/@:acct',
			async (request, reply) => {
				const url = await this.getAvatarUrl(
					request.params.acct,
					this.config.host,
				);

				reply.header('Cache-Control', 'public, max-age=86400');
				return reply.redirect(url ?? this.fallbackUrl);
			},
		);

		done();
	}
}
