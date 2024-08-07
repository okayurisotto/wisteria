/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { IsNull } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { RegistrationTicketsRepository, UsedUsernamesRepository, UserPendingsRepository, UserProfilesRepository, UsersRepository, MiRegistrationTicket } from '@/models/_.js';
import type { Config } from '@/config.js';
import { MetaService } from '@/core/MetaService.js';
import { CaptchaService } from '@/core/CaptchaService.js';
import { IdService } from '@/core/IdService.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { EmailService } from '@/core/EmailService.js';
import type { MiLocalUser } from '@/models/User.js';
import { L_CHARS, secureRndstr } from '@/misc/secure-rndstr.js';
import { SigninService } from './SigninService.js';
import { envOption } from '@/env.js';
import type { Context } from 'hono';
import { z } from 'zod';

@Injectable()
export class SignupApiService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private readonly userProfilesRepository: UserProfilesRepository,

		@Inject(DI.userPendingsRepository)
		private readonly userPendingsRepository: UserPendingsRepository,

		@Inject(DI.usedUsernamesRepository)
		private readonly usedUsernamesRepository: UsedUsernamesRepository,

		@Inject(DI.registrationTicketsRepository)
		private readonly registrationTicketsRepository: RegistrationTicketsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly idService: IdService,
		private readonly metaService: MetaService,
		private readonly captchaService: CaptchaService,
		private readonly signupService: SignupService,
		private readonly signinService: SigninService,
		private readonly emailService: EmailService,
	) {}

	public async signup(c: Context): Promise<Response> {
		const body = z.object({
			'username': z.string(),
			'password': z.string(),
			'host': z.string().nullish(),
			'invitationCode': z.string().nullish(),
			'emailAddress': z.string().nullish(),
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
		const emailAddress = body['emailAddress'];

		if (instance.emailRequiredForSignup) {
			if (emailAddress == null) {
				return c.text('UNKNOWN_ERROR', 400);
			}

			const res = await this.emailService.validateEmailForAccount(emailAddress);
			if (!res.available) {
				return c.text('UNKNOWN_ERROR', 400);
			}
		}

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

			// メアド認証が有効の場合
			if (instance.emailRequiredForSignup) {
				// メアド認証済みならエラー
				if (ticket.usedBy) {
					return c.text('UNKNOWN_ERROR', 400);
				}

				// 認証しておらず、メール送信から30分以内ならエラー
				if (ticket.usedAt && ticket.usedAt.getTime() + (1000 * 60 * 30) > Date.now()) {
					return c.text('UNKNOWN_ERROR', 400);
				}
			} else if (ticket.usedAt) {
				return c.text('UNKNOWN_ERROR', 400);
			}
		}

		if (instance.emailRequiredForSignup) {
			if (await this.usersRepository.exists({ where: { usernameLower: username.toLowerCase(), host: IsNull() } })) {
				return c.text('DUPLICATED_USERNAME', 400);
			}

			// Check deleted username duplication
			if (await this.usedUsernamesRepository.exists({ where: { username: username.toLowerCase() } })) {
				return c.text('USED_USERNAME', 400);
			}

			const isPreserved = instance.preservedUsernames.map(x => x.toLowerCase()).includes(username.toLowerCase());
			if (isPreserved) {
				return c.text('DENIED_USERNAME', 400);
			}

			const code = secureRndstr(16, { chars: L_CHARS });

			// Generate hash of password
			const salt = await bcrypt.genSalt(8);
			const hash = await bcrypt.hash(password, salt);

			const pendingUser = await this.userPendingsRepository.insert({
				id: this.idService.gen(),
				code,
				email: emailAddress,
				username: username,
				password: hash,
			}).then(x => this.userPendingsRepository.findOneByOrFail(x.identifiers[0]));

			const link = `${this.config.url}/signup-complete/${code}`;

			this.emailService.sendEmail(emailAddress!, 'Signup',
				`To complete signup, please click this link:<br><a href="${link}">${link}</a>`,
				`To complete signup, please click this link: ${link}`);

			if (ticket) {
				await this.registrationTicketsRepository.update(ticket.id, {
					usedAt: new Date(),
					pendingUserId: pendingUser.id,
				});
			}

			return c.body(null, 204);
		} else {
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

	public async signupPending(c: Context): Promise<Response> {
		const body = z.object({ code: z.string() }).safeParse(await c.req.json()).data;
		if (body === undefined) return c.text('UNKNOWN_ERROR', 400);

		try {
			const pendingUser = await this.userPendingsRepository.findOneByOrFail({ code: body.code });

			if (this.idService.parse(pendingUser.id).date.getTime() + (1000 * 60 * 30) < Date.now()) {
				return c.text('EXPIRED', 400);
			}

			const { account } = await this.signupService.signup({
				username: pendingUser.username,
				passwordHash: pendingUser.password,
			});

			await this.userPendingsRepository.delete({
				id: pendingUser.id,
			});

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: account.id });

			await this.userProfilesRepository.update({ userId: profile.userId }, {
				email: pendingUser.email,
				emailVerified: true,
				emailVerifyCode: null,
			});

			const ticket = await this.registrationTicketsRepository.findOneBy({ pendingUserId: pendingUser.id });
			if (ticket) {
				await this.registrationTicketsRepository.update(ticket.id, {
					usedBy: account,
					usedById: account.id,
					pendingUserId: null,
				});
			}

			return this.signinService.signin(c, account as MiLocalUser);
		} catch (err) {
			return c.text(typeof err === 'string' ? err : 'UNKNOWN_ERROR', 400);
		}
	}
}
