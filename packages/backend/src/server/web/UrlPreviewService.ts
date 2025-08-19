/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { summaly } from '@misskey-dev/summaly';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { MetaService } from '@/core/MetaService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import type { Logger } from '@/logger.js';
import { query } from '@/misc/prelude/url.js';
import { LoggerService } from '@/core/LoggerService.js';
import { ApiError } from '@/server/api/error.js';
import type { Context } from 'hono';

const SUPPORTED_SCHEMAS = ['http:', 'https:'];

@Injectable()
export class UrlPreviewService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly metaService: MetaService,
		private readonly httpRequestService: HttpRequestService,
		private readonly loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('url-preview');
	}

	private wrap(url: string | null): string | null {
		if (url === null) return null;
		if (!SUPPORTED_SCHEMAS.includes(new URL(url).protocol))  throw new Error('unsupported schema included');

		const proxiedUrl = new URL(`${this.config.mediaProxy}/preview.webp`);
		proxiedUrl.searchParams.set('url', url);
		proxiedUrl.searchParams.set('preview', '1');

		return proxiedUrl.href;
	}

	public async handle(c: Context): Promise<Response> {
		const url = c.req.query('url');
		if (typeof url !== 'string') return c.body(null, 400);

		const lang = c.req.query('lang') ?? 'ja-JP';

		const meta = await this.metaService.fetch();

		this.logger.info(
			meta.summalyProxy
				? `(Proxy) Getting preview of ${url}@${lang} ...`
				: `Getting preview of ${url}@${lang} ...`,
		);

		try {
			const summary = meta.summalyProxy
				? await this.httpRequestService.getJson<ReturnType<typeof summaly>>(
					`${meta.summalyProxy}?${query({ url: url, lang: lang })}`)
				: await summaly(url, {
					followRedirects: false,
					lang: lang,
					agent: this.config.proxy
						? {
								http: this.httpRequestService.httpAgent,
								https: this.httpRequestService.httpsAgent,
							}
						: {},
				});

			this.logger.succ(`Got preview of ${url}: ${summary.title}`);

			if (!SUPPORTED_SCHEMAS.includes(new URL(summary.url).protocol)) {
				throw new Error('unsupported schema included');
			}

			if (summary.player.url !== null && !SUPPORTED_SCHEMAS.includes(new URL(summary.player.url).protocol)) {
				throw new Error('unsupported schema included');
			}

			summary.icon = this.wrap(summary.icon);
			summary.thumbnail = this.wrap(summary.thumbnail);

			// Cache 7days
			c.header('Cache-Control', 'max-age=604800, immutable');

			return c.json(summary);
		} catch (err) {
			this.logger.warn(`Failed to get preview of ${url}: ${err}`);

			return new ApiError({
				message: 'Failed to get preview',
				code: 'URL_PREVIEW_FAILED',
				id: '09d01cb5-53b9-4856-82e5-38a50c290a3b',
				httpStatusCode: 422,
			}).serialize().reply(c);
		}
	}
}
