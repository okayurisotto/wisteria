/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import JSON5 from 'json5';
import type { AdsRepository } from '@/models/_.js';
import { MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { MetaService } from '@/core/MetaService.js';
import { InstanceActorService } from '@/core/InstanceActorService.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { DEFAULT_POLICIES } from '@/core/RoleService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { RolePoliciesSchema } from '@/models/zod/role.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,

	res: z.object({
		maintainerName: z.string().nullable().optional(),
		maintainerEmail: z.string().nullable().optional(),
		version: z.string().optional(),
		providesTarball: z.boolean().optional(),
		name: z.string().optional(),
		shortName: z.string().nullable().optional(),
		uri: z.string()/* example: "https://misskey.example.com" *//* format: url */.optional(),
		description: z.string().nullable().optional(),
		langs: z.string().array().optional(),
		tosUrl: z.string().nullable().optional(),
		repositoryUrl: z.string().nullable().default('https://github.com/misskey-dev/misskey'),
		feedbackUrl: z.string().nullable().default('https://github.com/misskey-dev/misskey/issues/new'),
		defaultDarkTheme: z.string().nullable().optional(),
		defaultLightTheme: z.string().nullable().optional(),
		disableRegistration: z.boolean().optional(),
		cacheRemoteFiles: z.boolean().optional(),
		cacheRemoteSensitiveFiles: z.boolean().optional(),
		emailRequiredForSignup: z.boolean().optional(),
		enableHcaptcha: z.boolean().optional(),
		hcaptchaSiteKey: z.string().nullable().optional(),
		enableMcaptcha: z.boolean().optional(),
		mcaptchaSiteKey: z.string().nullable().optional(),
		mcaptchaInstanceUrl: z.string().nullable().optional(),
		enableRecaptcha: z.boolean().optional(),
		recaptchaSiteKey: z.string().nullable().optional(),
		enableTurnstile: z.boolean().optional(),
		turnstileSiteKey: z.string().nullable().optional(),
		swPublickey: z.string().nullable().optional(),
		mascotImageUrl: z.string().default('/assets/ai.png'),
		bannerUrl: z.string().optional(),
		serverErrorImageUrl: z.string().nullable().optional(),
		infoImageUrl: z.string().nullable().optional(),
		notFoundImageUrl: z.string().nullable().optional(),
		iconUrl: z.string().nullable().optional(),
		maxNoteTextLength: z.number().optional(),
		ads: z.object({
			id: IdSchema.optional(),
			url: z.string()/* format: url */.optional(),
			place: z.string().optional(),
			ratio: z.number().optional(),
			imageUrl: z.string()/* format: url */.optional(),
			dayOfWeek: z.number().int().optional(),
		}).array(),
		notesPerOneAd: z.number().default(0),
		requireSetup: z.boolean().optional(),
		enableEmail: z.boolean().optional(),
		enableServiceWorker: z.boolean().optional(),
		translatorAvailable: z.boolean().optional(),
		proxyAccountName: z.string().nullable().optional(),
		mediaProxy: z.string().optional(),
		features: z.object({
			registration: z.boolean().optional(),
			localTimeline: z.boolean().optional(),
			globalTimeline: z.boolean().optional(),
			hcaptcha: z.boolean().optional(),
			recaptcha: z.boolean().optional(),
			objectStorage: z.boolean().optional(),
			serviceWorker: z.boolean().optional(),
			miauth: z.boolean().optional().default(true),
		}),
		backgroundImageUrl: z.string().nullable().optional(),
		impressumUrl: z.string().nullable().optional(),
		logoImageUrl: z.string().nullable().optional(),
		privacyPolicyUrl: z.string().nullable().optional(),
		serverRules: z.string().array().optional(),
		themeColor: z.string().nullable().optional(),
		policies: RolePoliciesSchema.optional(),
	}),
} as const;

export const paramDef = z.object({
	detail: z.boolean().default(true),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.adsRepository)
		private readonly adsRepository: AdsRepository,

		private readonly userEntityService: UserEntityService,
		private readonly metaService: MetaService,
		private readonly instanceActorService: InstanceActorService,
	) {
		super(meta, paramDef, async (ps) => {
			const instance = await this.metaService.fetch();

			const ads = await this.adsRepository.createQueryBuilder('ads')
				.where('ads.expiresAt > :now', { now: new Date() })
				.andWhere('ads.startsAt <= :now', { now: new Date() })
				.andWhere(new Brackets((qb) => {
					// 曜日のビットフラグを確認する
					qb.where('ads.dayOfWeek & :dayOfWeek > 0', { dayOfWeek: 1 << new Date().getDay() })
						.orWhere('ads.dayOfWeek = 0');
				}))
				.getMany();

			const response: any = {
				maintainerName: instance.maintainerName,
				maintainerEmail: instance.maintainerEmail,

				version: this.config.version,
				providesTarball: this.config.publishTarballInsteadOfProvideRepositoryUrl,

				name: instance.name,
				shortName: instance.shortName,
				uri: this.config.url,
				description: instance.description,
				langs: instance.langs,
				tosUrl: instance.termsOfServiceUrl,
				repositoryUrl: instance.repositoryUrl,
				feedbackUrl: instance.feedbackUrl,
				impressumUrl: instance.impressumUrl,
				privacyPolicyUrl: instance.privacyPolicyUrl,
				disableRegistration: instance.disableRegistration,
				emailRequiredForSignup: instance.emailRequiredForSignup,
				enableHcaptcha: instance.enableHcaptcha,
				hcaptchaSiteKey: instance.hcaptchaSiteKey,
				enableMcaptcha: instance.enableMcaptcha,
				mcaptchaSiteKey: instance.mcaptchaSitekey,
				mcaptchaInstanceUrl: instance.mcaptchaInstanceUrl,
				enableRecaptcha: instance.enableRecaptcha,
				recaptchaSiteKey: instance.recaptchaSiteKey,
				enableTurnstile: instance.enableTurnstile,
				turnstileSiteKey: instance.turnstileSiteKey,
				swPublickey: instance.swPublicKey,
				themeColor: instance.themeColor,
				mascotImageUrl: instance.mascotImageUrl,
				bannerUrl: instance.bannerUrl,
				infoImageUrl: instance.infoImageUrl,
				serverErrorImageUrl: instance.serverErrorImageUrl,
				notFoundImageUrl: instance.notFoundImageUrl,
				iconUrl: instance.iconUrl,
				backgroundImageUrl: instance.backgroundImageUrl,
				logoImageUrl: instance.logoImageUrl,
				maxNoteTextLength: MAX_NOTE_TEXT_LENGTH,
				// クライアントの手間を減らすためあらかじめJSONに変換しておく
				defaultLightTheme: instance.defaultLightTheme ? JSON.stringify(JSON5.parse(instance.defaultLightTheme)) : null,
				defaultDarkTheme: instance.defaultDarkTheme ? JSON.stringify(JSON5.parse(instance.defaultDarkTheme)) : null,
				ads: ads.map(ad => ({
					id: ad.id,
					url: ad.url,
					place: ad.place,
					ratio: ad.ratio,
					imageUrl: ad.imageUrl,
					dayOfWeek: ad.dayOfWeek,
				})),
				notesPerOneAd: instance.notesPerOneAd,
				enableEmail: instance.enableEmail,
				enableServiceWorker: instance.enableServiceWorker,

				translatorAvailable: instance.deeplAuthKey != null,

				serverRules: instance.serverRules,

				policies: { ...DEFAULT_POLICIES, ...instance.policies },

				mediaProxy: this.config.mediaProxy,

				...(ps.detail
					? {
							cacheRemoteFiles: instance.cacheRemoteFiles,
							cacheRemoteSensitiveFiles: instance.cacheRemoteSensitiveFiles,
							requireSetup: !await this.instanceActorService.realLocalUsersPresent(),
						}
					: {}),
			};

			if (ps.detail) {
				const proxyAccount = instance.proxyAccountId ? await this.userEntityService.pack(instance.proxyAccountId).catch(() => null) : null;

				response.proxyAccountName = proxyAccount ? proxyAccount.username : null;
				response.features = {
					registration: !instance.disableRegistration,
					emailRequiredForSignup: instance.emailRequiredForSignup,
					hcaptcha: instance.enableHcaptcha,
					recaptcha: instance.enableRecaptcha,
					turnstile: instance.enableTurnstile,
					objectStorage: instance.useObjectStorage,
					serviceWorker: instance.enableServiceWorker,
					miauth: true,
				};
			}

			return response;
		});
	}
}
