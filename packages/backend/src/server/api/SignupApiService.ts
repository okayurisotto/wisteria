/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { RegistrationTicketsRepository, MiRegistrationTicket } from '@/models/_.js';
import { MetaService } from '@/core/MetaService.js';
import { CaptchaService } from '@/core/CaptchaService.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { envOption } from '@/env.js';
import type { Context } from 'hono';
import { z } from 'zod';

@Injectable()
export class SignupApiService {
	constructor(
		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly metaService: MetaService,
		private readonly captchaService: CaptchaService,
		private readonly signupService: SignupService,
	) {}

	public async signup(c: Context): Promise<Response> {
		const body = z.object({
			'username': z.string(),
			'password': z.string(),
			'host': z.string().nullish(),
			'invitationCode': z.string().nullish(),
			'hcaptcha-response': z.string().nullish(),
			'm-captcha-response': z.string().nullish(),
			'g-recaptcha-response': z.string().nullish(),
			'turnstile-response': z.string().nullish(),
		}).safeParse(await c.req.json()).data;

		if (body === undefined) {
			return c.json(null, 400);
		}

		const instance = await this.metaService.fetch();

		// Verify *Captcha
		// ただしテスト時はこの機構は障害となるため無効にする
		if (!envOption.isTest) {
			if (instance.enableHcaptcha && instance.hcaptchaSecretKey) {
				await this.captchaService.verifyHcaptcha(instance.hcaptchaSecretKey, body['hcaptcha-response']).catch(() => {
					return c.text('UNKNOWN_ERROR', 400);
				});
			}

			if (instance.enableMcaptcha && instance.mcaptchaSecretKey && instance.mcaptchaSitekey && instance.mcaptchaInstanceUrl) {
				await this.captchaService.verifyMcaptcha(instance.mcaptchaSecretKey, instance.mcaptchaSitekey, instance.mcaptchaInstanceUrl, body['m-captcha-response']).catch(() => {
					return c.text('UNKNOWN_ERROR', 400);
				});
			}

			if (instance.enableRecaptcha && instance.recaptchaSecretKey) {
				await this.captchaService.verifyRecaptcha(instance.recaptchaSecretKey, body['g-recaptcha-response']).catch(() => {
					return c.text('UNKNOWN_ERROR', 400);
				});
			}

			if (instance.enableTurnstile && instance.turnstileSecretKey) {
				await this.captchaService.verifyTurnstile(instance.turnstileSecretKey, body['turnstile-response']).catch(() => {
					return c.text('UNKNOWN_ERROR', 400);
				});
			}
		}

		const username = body['username'];
		const password = body['password'];
		const host: string | null = envOption.isTest ? (body['host'] ?? null) : null;
		const invitationCode = body['invitationCode'];

		let ticket: MiRegistrationTicket | null = null;

		if (instance.disableRegistration) {
			if (invitationCode == null) {
				return c.text('UNKNOWN_ERROR', 400);
			}

			ticket = await this.registrationTicketsRepository.findOneBy({
				code: invitationCode,
			});

			if (ticket == null || ticket.usedById != null) {
				return c.text('UNKNOWN_ERROR', 400);
			}

			if (ticket.expiresAt && ticket.expiresAt < new Date()) {
				return c.text('UNKNOWN_ERROR', 400);
			}

			if (ticket.usedAt) {
				return c.text('UNKNOWN_ERROR', 400);
			}
		}

		try {
			const { account, secret } = await this.signupService.signup({
				username, password, host,
			});

			const res = await this.userEntityService.pack(account, account, {
				schema: 'MeDetailed',
				includeSecrets: true,
			});

			if (ticket) {
				await this.registrationTicketsRepository.update(ticket.id, {
					usedAt: new Date(),
					usedBy: account,
					usedById: account.id,
				});
			}

			return c.json({
				...res,
				token: secret,
			});
		} catch (err) {
			return c.text(typeof err === 'string' ? err : 'UNKNOWN_ERROR', 400);
		}
	}
}
