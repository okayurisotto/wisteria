/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import * as fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import rename from 'rename';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { StatusError } from '@/misc/status-error.js';
import type Logger from '@/logger.js';
import { VideoProcessingService } from '@/core/VideoProcessingService.js';
import { contentDisposition } from '@/misc/content-disposition.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { isMimeImage } from '@/misc/is-mime-image.js';
import { correctFilename } from '@/misc/correct-filename.js';
import { handleRequestRedirectToOmitSearch } from '@/misc/fastify-hook-handlers.js';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';
import { ASSETS_DIR, DUMMY_PNG_FILE } from '@/path.js';
import { envOption } from '@/env.js';
import { FileGetService, DownloadError, DatabaseRecordNotFoundError, UnknownError, InvalidFileKeyError } from '@/core/FileGetService.js';
import { chunk, parseBytesRangeHeaderValue } from '@/misc/range-header-value.js';

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

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('Content-Security-Policy', 'default-src \'none\'; img-src \'self\'; media-src \'self\'; style-src \'unsafe-inline\'');

			if (envOption.isDevelopment) {
				reply.header('Access-Control-Allow-Origin', '*');
			}

			done();
		});

		fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);

		fastify.get('/files/app-default.jpg', (request, reply) => {
			const file = fs.createReadStream(DUMMY_PNG_FILE);
			reply.header('Content-Type', 'image/jpeg');
			reply.header('Cache-Control', 'max-age=31536000, immutable');
			return reply.send(file);
		});

		fastify.get<{ Params: { key: string } }>('/files/:key', async (request, reply) => {
			try {
				return await this.sendDriveFile(request.params.key, request.headers.range ?? null, reply);
			} catch (err: unknown) {
				this.errorHandler(request, reply, err);
				return;
			}
		});

		fastify.get<{ Params: { key: string } }>('/files/:key/*', async (request, reply) => {
			return await reply.redirect(301, `${this.config.url}/files/${request.params.key}`);
		});

		done();
	}

	private errorHandler(request: FastifyRequest<{ Params?: { [x: string]: unknown }; Querystring?: { [x: string]: unknown } }>, reply: FastifyReply, err?: unknown): void {
		this.logger.error(`${err}`);

		reply.header('Cache-Control', 'max-age=300');

		if (request.query && 'fallback' in request.query) {
			reply.sendFile('/dummy.png', ASSETS_DIR);
			return;
		}

		if (err instanceof InvalidFileKeyError) {
			reply.code(400);
			return;
		}

		if (err instanceof StatusError && (err.statusCode === 302 || err.isClientError)) {
			reply.code(err.statusCode);
			return;
		}

		reply.code(500);
		return;
	}

	private async sendDriveFile(key: string, range_: string | null, reply: FastifyReply): Promise<fs.ReadStream | Buffer | undefined> {
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
				reply.code(404);
				reply.header('Cache-Control', 'max-age=86400');
				reply.sendFile('/dummy.png', ASSETS_DIR);
				return;
			} else if (fileResult.error instanceof UnknownError) {
				reply.code(204);
				reply.header('Cache-Control', 'max-age=86400');
				return;
			} else if (fileResult.error instanceof DownloadError) {
				throw fileResult.error.data;
			} else {
				return fileResult.error satisfies never;
			}
		}

		const file = fileResult.value;

		if (file.state === 'remote') {
			//#region redirects

			if (
				file.fileRole === 'thumbnail' &&
				isMimeImage(file.mime, 'sharp-convertible-image-with-bmp')
			) {
				const url = new URL(`${this.config.mediaProxy}/static.webp`);
				url.searchParams.set('url', file.url);
				url.searchParams.set('static', '1');

				file.cleanup();

				reply.header('Cache-Control', 'max-age=31536000, immutable');
				await reply.redirect(301, url.href);
				return;
			}

			const externalThumbnail = this.videoProcessingService.getExternalVideoThumbnailUrl(file.url);

			if (
				file.fileRole === 'thumbnail' &&
				file.mime.startsWith('video/') &&
				externalThumbnail !== null
			) {
				file.cleanup();
				await reply.redirect(301, externalThumbnail);
				return;
			}

			if (
				file.fileRole === 'webpublic' &&
				['image/svg+xml'].includes(file.mime)
			) {
				const url = new URL(`${this.config.mediaProxy}/svg.webp`);
				url.searchParams.set('url', file.url);

				file.cleanup();

				reply.header('Cache-Control', 'max-age=31536000, immutable');
				await reply.redirect(301, url.toString());
				return;
			}

			//#endregion

			try {
				if (file.fileRole === 'thumbnail' && file.mime.startsWith('video/')) {
					const image = await this.videoProcessingService.generateVideoThumbnail(file.path);
					file.cleanup();
					reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(image.type) ? image.type : 'application/octet-stream');
					reply.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, image.ext)));
					return image.data;
				} else {
					if (range === null || file.file.size === 0) {
						const dataStream = fs.createReadStream(file.path);

						dataStream.on('end', file.cleanup);
						dataStream.on('close', file.cleanup);

						reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
						reply.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, file.ext)));

						return dataStream;
					} else {
						const { start, end, chunksize } = chunk(range, file.file.size);

						const dataStream = fs.createReadStream(file.path, { start, end });
						dataStream.on('end', file.cleanup);
						dataStream.on('close', file.cleanup);

						reply.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
						reply.header('Accept-Ranges', 'bytes');
						reply.header('Content-Length', chunksize);
						reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
						reply.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, file.ext)));

						return dataStream;
					}
				}
			} catch (e) {
				file.cleanup();
				throw e;
			}
		} else {
			if (file.fileRole === 'original') {
				if (range === null || file.file.size === 0) {
					reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.file.type) ? file.file.type : 'application/octet-stream');
					reply.header('Cache-Control', 'max-age=31536000, immutable');
					reply.header('Content-Disposition', contentDisposition('inline', file.filename));

					return fs.createReadStream(file.path);
				} else {
					const { start, end, chunksize } = chunk(range, file.file.size);

					const fileStream = fs.createReadStream(file.path, { start, end });

					reply.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
					reply.header('Accept-Ranges', 'bytes');
					reply.header('Content-Length', chunksize);
					reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.file.type) ? file.file.type : 'application/octet-stream');
					reply.header('Cache-Control', 'max-age=31536000, immutable');
					reply.header('Content-Disposition', contentDisposition('inline', file.filename));
					reply.code(206);

					return fileStream;
				}
			} else {
				const suffix = file.fileRole === 'thumbnail' ? '-thumb' : '-web';
				const extname = file.ext ? `.${file.ext}` : '.unknown';
				const filename = rename(file.filename, { suffix, extname }).toString();

				if (range === null || file.file.size === 0) {
					reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
					reply.header('Cache-Control', 'max-age=31536000, immutable');
					reply.header('Content-Disposition', contentDisposition('inline', filename));
					return fs.createReadStream(file.path);
				} else {
					const { start, end, chunksize } = chunk(range, file.file.size);
					const fileStream = fs.createReadStream(file.path, { start, end });
					reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
					reply.header('Cache-Control', 'max-age=31536000, immutable');
					reply.header('Content-Disposition', contentDisposition('inline', filename));
					reply.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
					reply.header('Accept-Ranges', 'bytes');
					reply.header('Content-Length', chunksize);
					reply.code(206);
					return fileStream;
				}
			}
		}
	}
}
