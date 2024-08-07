/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import rename from 'rename';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { StatusError } from '@/misc/status-error.js';
import type { Logger } from '@/logger.js';
import { VideoProcessingService } from '@/core/VideoProcessingService.js';
import { contentDisposition } from '@/misc/content-disposition.js';
import { LoggerService } from '@/core/LoggerService.js';
import { isMimeImage } from '@/misc/is-mime-image.js';
import { correctFilename } from '@/misc/correct-filename.js';
import { DUMMY_PNG_FILE } from '@/path.js';
import { envOption } from '@/env.js';
import { FileGetService, DownloadError, DatabaseRecordNotFoundError, UnknownError, InvalidFileKeyError } from '@/core/FileGetService.js';
import { chunk, parseBytesRangeHeaderValue } from '@/misc/range-header-value.js';
import { Hono, type Context } from 'hono';
import { omitSearch } from './omitSearch.js';
import { serveStaticFile } from 'hono-serve-static';

@Injectable()
export class FileServerService {
	private readonly logger: Logger;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly videoProcessingService: VideoProcessingService,
		private readonly loggerService: LoggerService,
		private readonly fileGetService: FileGetService,
	) {
		this.logger = this.loggerService.getLogger('server', 'gray');
	}

	public createServer(): Hono {
		const hono = new Hono();

		hono.use(omitSearch, async (c, next) => {
			c.header('Content-Security-Policy', 'default-src \'none\'; img-src \'self\'; media-src \'self\'; style-src \'unsafe-inline\'');

			if (!envOption.isProduction) {
				c.header('Access-Control-Allow-Origin', '*');
			}

			await next();
		});

		hono.get(
			'/app-default.jpg',
			async (c, next) => {
				c.header('Content-Type', 'image/jpeg');
				c.header('Cache-Control', 'max-age=31536000, immutable');
				await next();
			},
			serveStaticFile({ path: DUMMY_PNG_FILE }),
		);

		hono.get('/:key', async (c) => {
			try {
				return await this.sendDriveFile(c.req.param('key'), c.req.header('range') ?? null, c);
			} catch (err: unknown) {
				return this.errorHandler(c, err);
			}
		});

		hono.get('/:key/*', (c) => {
			return c.redirect(`${this.config.url}/files/${c.req.param('key')}`, 301);
		});

		return hono;
	}

	private errorHandler(c: Context, err?: unknown): Response {
		this.logger.error(`${err}`);

		c.header('Cache-Control', 'max-age=300');

		if (err instanceof InvalidFileKeyError) {
			return c.body(null, 400);
		}

		if (err instanceof StatusError && (err.statusCode === 302 || err.isClientError)) {
			return c.body(null, err.statusCode);
		}

		return c.body(null, 500);
	}

	private async sendDriveFile(key: string, range_: string | null, c: Context): Promise<Response> {
		const range = (() => {
			if (range_ === null) return null;

			const result = parseBytesRangeHeaderValue(range_);
			if (result === null) return null;

			// TODO: 末尾からの範囲を指定されたときも処理できるようにする
			if (result.suffix) return null;

			// TODO: 複数の範囲が指定されたときも処理できるようにする
			return result.ranges[0] ?? null;
		})();

		const fileResult = await this.fileGetService.getFromKey(key).then();

		if (!fileResult.ok) {
			if (fileResult.error instanceof DatabaseRecordNotFoundError) {
				c.status(404);
				c.header('Cache-Control', 'max-age=86400');
				// c.sendFile('/dummy.png', ASSETS_DIR);
				return c.body(null);
			} else if (fileResult.error instanceof UnknownError) {
				c.status(204);
				c.header('Cache-Control', 'max-age=86400');
				return c.body(null);
			} else if (fileResult.error instanceof DownloadError) {
				throw fileResult.error.data;
			} else {
				return fileResult.error satisfies never;
			}
		}

		const file = fileResult.value;

		if (file.state === 'remote') {
			// #region redirects

			if (
				file.fileRole === 'thumbnail' &&
				isMimeImage(file.mime, 'sharp-convertible-image-with-bmp')
			) {
				const url = new URL(`${this.config.mediaProxy}/static.webp`);
				url.searchParams.set('url', file.url);
				url.searchParams.set('static', '1');

				file.cleanup();

				c.header('Cache-Control', 'max-age=31536000, immutable');
				return c.redirect(url.href, 301);
			}

			const externalThumbnail = this.videoProcessingService.getExternalVideoThumbnailUrl(file.url);

			if (
				file.fileRole === 'thumbnail' &&
				file.mime.startsWith('video/') &&
				externalThumbnail !== null
			) {
				file.cleanup();
				return c.redirect(externalThumbnail, 301);
			}

			if (
				file.fileRole === 'webpublic' &&
				['image/svg+xml'].includes(file.mime)
			) {
				const url = new URL(`${this.config.mediaProxy}/svg.webp`);
				url.searchParams.set('url', file.url);

				file.cleanup();

				c.header('Cache-Control', 'max-age=31536000, immutable');
				return c.redirect(url.toString(), 301);
			}

			// #endregion

			try {
				if (file.fileRole === 'thumbnail' && file.mime.startsWith('video/')) {
					const image = await this.videoProcessingService.generateVideoThumbnail(file.path);
					file.cleanup();
					c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(image.type) ? image.type : 'application/octet-stream');
					c.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, image.ext)));
					return c.body(image.data);
				} else {
					if (range === null || file.file.size === 0) {
						const dataStream = fs.createReadStream(file.path);

						dataStream.on('end', file.cleanup);
						dataStream.on('close', file.cleanup);

						c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
						c.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, file.ext)));

						return c.body(dataStream);
					} else {
						const { start, end, chunksize } = chunk(range, file.file.size);

						const dataStream = fs.createReadStream(file.path, { start, end });
						dataStream.on('end', file.cleanup);
						dataStream.on('close', file.cleanup);

						c.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
						c.header('Accept-Ranges', 'bytes');
						c.header('Content-Length', chunksize.toString());
						c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
						c.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, file.ext)));

						return c.body(dataStream);
					}
				}
			} catch (e) {
				file.cleanup();
				throw e;
			}
		} else {
			if (file.fileRole === 'original') {
				if (range === null || file.file.size === 0) {
					c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.file.type) ? file.file.type : 'application/octet-stream');
					c.header('Cache-Control', 'max-age=31536000, immutable');
					c.header('Content-Disposition', contentDisposition('inline', file.filename));

					return c.body(fs.createReadStream(file.path));
				} else {
					const { start, end, chunksize } = chunk(range, file.file.size);

					const fileStream = fs.createReadStream(file.path, { start, end });

					c.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
					c.header('Accept-Ranges', 'bytes');
					c.header('Content-Length', chunksize.toString());
					c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.file.type) ? file.file.type : 'application/octet-stream');
					c.header('Cache-Control', 'max-age=31536000, immutable');
					c.header('Content-Disposition', contentDisposition('inline', file.filename));
					c.status(206);

					return c.body(fileStream);
				}
			} else {
				const suffix = file.fileRole === 'thumbnail' ? '-thumb' : '-web';
				const extname = file.ext ? `.${file.ext}` : '.unknown';
				const filename = rename(file.filename, { suffix, extname }).toString();

				if (range === null || file.file.size === 0) {
					c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
					c.header('Cache-Control', 'max-age=31536000, immutable');
					c.header('Content-Disposition', contentDisposition('inline', filename));
					return c.body(fs.createReadStream(file.path));
				} else {
					const { start, end, chunksize } = chunk(range, file.file.size);
					const fileStream = fs.createReadStream(file.path, { start, end });
					c.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
					c.header('Cache-Control', 'max-age=31536000, immutable');
					c.header('Content-Disposition', contentDisposition('inline', filename));
					c.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
					c.header('Accept-Ranges', 'bytes');
					c.header('Content-Length', chunksize.toString());
					c.status(206);
					return c.body(fileStream);
				}
			}
		}
	}
}
