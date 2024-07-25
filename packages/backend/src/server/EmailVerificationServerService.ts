/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

const FAILED_MESSAGE =
	'Verification failed. Please try again. メールアドレスの認証に失敗しました。もう一度お試しください';
const SUCCEEDED_MESSAGE =
	'Verification succeeded! メールアドレスの認証に成功しました。';

@Injectable()
export class EmailVerificationServerService {
	public constructor(
		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		private readonly globalEventService: GlobalEventService,
		private readonly userEntityService: UserEntityService,
	) {}

	public async verify(code: string): Promise<boolean> {
		const profile = await this.userProfilesRepository.findOneBy({
			emailVerifyCode: code,
		});
		if (profile === null) return false;

		await this.userProfilesRepository.update(
			{ userId: profile.userId },
			{
				emailVerified: true,
				emailVerifyCode: null,
			},
		);

		this.globalEventService.publishMainStream(
			profile.userId,
			'meUpdated',
			await this.userEntityService.pack(
				profile.userId,
				{ id: profile.userId },
				{
					schema: 'MeDetailed',
					includeSecrets: true,
				},
			),
		);

		return true;
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.get<{ Params: { code: string } }>(
			'/verify-email/:code',
			async (request, reply) => {
				const verified = await this.verify(request.params.code);

				if (verified) {
					reply.code(200).send(SUCCEEDED_MESSAGE);
				} else {
					reply.code(404).send(FAILED_MESSAGE);
				}
			},
		);

		done();
	}
}
