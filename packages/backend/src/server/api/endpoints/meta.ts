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
import { MetaService } from '@/core/MetaService.js';
import { InstanceActorService } from '@/core/InstanceActorService.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { DEFAULT_POLICIES } from '@/core/RoleService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { RolePoliciesSchema } from '@/models/zod/role.js';
import { UserLiteEntityService } from '@/core/entities/UserLiteEntityService';

export const meta = {
	tags: ['meta'],

	requireCredential: false,

	res: z.object({
		maintainerName: z.string().nullable(),
		maintainerEmail: z.string().nullable(),
		version: z.string(),
		providesTarball: z.boolean(),
		name: z.string().nullable(),
		shortName: z.string().nullable(),
		uri: z.string()/* example: "https://misskey.example.com" *//* format: url */,
		description: z.string().nullable(),
		langs: z.string().array(),
		tosUrl: z.string().nullable(),
		repositoryUrl: z.string().nullable(),
		feedbackUrl: z.string().nullable(),
		defaultDarkTheme: z.string().nullable(),
		defaultLightTheme: z.string().nullable(),
		disableRegistration: z.boolean(),
		cacheRemoteFiles: z.boolean().optional(),
		cacheRemoteSensitiveFiles: z.boolean().optional(),
		emailRequiredForSignup: z.boolean(),
		enableHcaptcha: z.boolean(),
		hcaptchaSiteKey: z.string().nullable(),
		enableMcaptcha: z.boolean(),
		mcaptchaSiteKey: z.string().nullable(),
		mcaptchaInstanceUrl: z.string().nullable(),
		enableRecaptcha: z.boolean(),
		recaptchaSiteKey: z.string().nullable(),
		enableTurnstile: z.boolean(),
		turnstileSiteKey: z.string().nullable(),
		swPublickey: z.string().nullable(),
		mascotImageUrl: z.string().nullable(),
		bannerUrl: z.string().optional().nullable(),
		serverErrorImageUrl: z.string().nullable(),
		infoImageUrl: z.string().nullable(),
		notFoundImageUrl: z.string().nullable(),
		iconUrl: z.string().nullable(),
		maxNoteTextLength: z.number(),
		ads: z.object({
			id: IdSchema,
			url: z.string()/* format: url */,
			place: z.string(),
			ratio: z.number(),
			imageUrl: z.string()/* format: url */,
			dayOfWeek: z.number().int(),
		}).array(),
		notesPerOneAd: z.number(),
		requireSetup: z.boolean().optional(),
		enableEmail: z.boolean(),
		enableServiceWorker: z.boolean(),
		translatorAvailable: z.boolean(),
		proxyAccountName: z.string().nullable().optional(),
		mediaProxy: z.string(),
		features: z.object({
			registration: z.boolean(),
			localTimeline: z.boolean().optional(),
			globalTimeline: z.boolean().optional(),
			hcaptcha: z.boolean(),
			recaptcha: z.boolean(),
			objectStorage: z.boolean(),
			serviceWorker: z.boolean(),
			miauth: z.boolean(),
			emailRequiredForSignup: z.boolean(),
			turnstile: z.boolean(),
		}).optional(),
		backgroundImageUrl: z.string().nullable(),
		impressumUrl: z.string().nullable(),
		logoImageUrl: z.string().nullable(),
		privacyPolicyUrl: z.string().nullable(),
		serverRules: z.string().array(),
		themeColor: z.string().nullable(),
		policies: RolePoliciesSchema,
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

		private readonly metaService: MetaService,
		private readonly instanceActorService: InstanceActorService,
		private readonly userLiteEntityService: UserLiteEntityService,
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

			const response: z.infer<(typeof meta)['res']> = {
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
				defaultLightTheme: instance.defaultLightTheme !== null
					? JSON.stringify(JSON5.parse(instance.defaultLightTheme))
					: null,
				defaultDarkTheme: instance.defaultDarkTheme !== null
					? JSON.stringify(JSON5.parse(instance.defaultDarkTheme))
					: null,
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
			};

			if (ps.detail) {
				const proxyAccount = instance.proxyAccountId !== null
					? await this.userLiteEntityService.packLite(instance.proxyAccountId).catch(() => null)
					: null;

				response.proxyAccountName = proxyAccount ? proxyAccount.username : null;
				response.cacheRemoteFiles = instance.cacheRemoteFiles;
				response.cacheRemoteSensitiveFiles = instance.cacheRemoteSensitiveFiles;
				response.requireSetup = !await this.instanceActorService.realLocalUsersPresent();
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
