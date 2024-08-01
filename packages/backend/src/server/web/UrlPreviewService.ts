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
import type Logger from '@/logger.js';
import { query } from '@/misc/prelude/url.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { ApiError } from '@/server/api/error.js';
import type { Context } from 'hono';

@Injectable()
export class UrlPreviewService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		private metaService: MetaService,
		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('url-preview');
	}

	@bindThis
	private wrap(url?: string | null): string | null {
		return url != null
			? url.match(/^https?:\/\//)
				? `${this.config.mediaProxy}/preview.webp?${query({
					url,
					preview: '1',
				})}`
				: url
			: null;
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

			if (!(summary.url.startsWith('http://') || summary.url.startsWith('https://'))) {
				throw new Error('unsupported schema included');
			}

			if (summary.player.url && !(summary.player.url.startsWith('http://') || summary.player.url.startsWith('https://'))) {
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
