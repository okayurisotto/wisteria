/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import * as fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import sharp, { type Sharp } from 'sharp';
import { sharpBmp } from '@misskey-dev/sharp-read-bmp';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { StatusError } from '@/misc/status-error.js';
import type Logger from '@/logger.js';
import {
	ImageProcessingService,
	webpDefault,
} from '@/core/ImageProcessingService.js';
import { contentDisposition } from '@/misc/content-disposition.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { isMimeImage } from '@/misc/is-mime-image.js';
import { correctFilename } from '@/misc/correct-filename.js';
import type {
	FastifyInstance,
	FastifyRequest,
	FastifyReply,
	FastifyPluginOptions,
} from 'fastify';
import { ASSETS_DIR } from '@/path.js';
import { envOption } from '@/env.js';
import { z } from 'zod';
import {
	FileGetService,
	InternalFile,
	DownloadError,
	DatabaseRecordNotFoundError,
	UnknownError,
	InvalidFileKeyError,
} from '@/core/FileGetService.js';
import {
	chunk,
	parseBytesRangeHeaderValue,
} from '@/misc/range-header-value.js';

@Injectable()
export class FileProxyServerService {
	private readonly logger: Logger;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly imageProcessingService: ImageProcessingService,
		private readonly loggerService: LoggerService,
		private readonly fileGetService: FileGetService,
	) {
		this.logger = this.loggerService.getLogger('server', 'gray');
	}

	@bindThis
	public createServer(
		fastify: FastifyInstance,
		options: FastifyPluginOptions,
		done: (err?: Error) => void,
	) {
		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header(
				'Content-Security-Policy',
				"default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
			);

			if (envOption.isDevelopment) {
				reply.header('Access-Control-Allow-Origin', '*');
			}

			done();
		});

		fastify.get<{
			Params: { url: string };
			Querystring: { url?: string };
		}>('/proxy/:url*', async (request, reply) => {
			try {
				return await this.proxyHandler(request, reply);
			} catch (err: unknown) {
				this.errorHandler(request, reply, err);
				return;
			}
		});

		done();
	}

	private errorHandler(
		request: FastifyRequest<{
			Params?: { [x: string]: unknown };
			Querystring?: { [x: string]: unknown };
		}>,
		reply: FastifyReply,
		err?: unknown,
	): void {
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

		if (
			err instanceof StatusError &&
			(err.statusCode === 302 || err.isClientError)
		) {
			reply.code(err.statusCode);
			return;
		}

		reply.code(500);
		return;
	}

	private async proxyHandler(request: FastifyRequest, reply: FastifyReply) {
		const query = z
			.object({
				url: z.string().optional(),
				origin: z.string().optional(),
				emoji: z.string().optional(),
				avatar: z.string().optional(),
				static: z.string().optional(),
				preview: z.string().optional(),
				badge: z.string().optional(),
			})
			.parse(request.query);

		const params = z
			.object({
				url: z.string().optional(),
			})
			.parse(request.params);

		const opts = {
			url: query.url ?? (params.url ? 'https://' + params.url : null),
			/** アバタークロップなど、どうしてもオリジンである必要がある場合 */
			mustOrigin: query.origin !== undefined,
			emoji: query.emoji !== undefined,
			avatar: query.avatar !== undefined,
			static: query.static !== undefined,
			preview: query.preview !== undefined,
			badge: query.badge !== undefined,
		} as const;

		if (opts.url === null) {
			reply.code(400);
			return;
		}

		const range_ = request.headers.range ?? null;

		const range = (() => {
			if (range_ === null) return null;

			const result = parseBytesRangeHeaderValue(range_);
			if (result === null) return null;

			// TODO: 末尾からの範囲を指定されたときも処理できるようにする
			if (result.suffix) return null;

			// TODO: 複数の範囲が指定されたときも処理できるようにする
			return result.ranges[0] ?? null;
		})();

		//#region 外部のメディアプロキシが有効なら、そちらにリダイレクト

		if (this.config.externalMediaProxyEnabled && !opts.mustOrigin) {
			reply.header('Cache-Control', 'public, max-age=259200'); // 3 days

			const url = new URL(`${this.config.mediaProxy}/${params.url ?? ''}`);

			if (opts.avatar) url.searchParams.set('avatar', '');
			if (opts.badge) url.searchParams.set('badge', '');
			if (opts.emoji) url.searchParams.set('emoji', '');
			if (opts.preview) url.searchParams.set('preview', '');
			if (opts.static) url.searchParams.set('static', '');
			if (opts.url) url.searchParams.set('url', '');

			return await reply.redirect(301, url.href);
		}

		//#endregion

		const fileResult = await this.fileGetService.getFromUrl(opts.url);

		if (!fileResult.ok) {
			if (fileResult.error instanceof DatabaseRecordNotFoundError) {
				reply.code(404);
				reply.header('Cache-Control', 'max-age=86400');
				return reply.sendFile('/dummy.png', ASSETS_DIR);
			} else if (fileResult.error instanceof UnknownError) {
				reply.code(204);
				reply.header('Cache-Control', 'max-age=86400');
				return;
			} else if (fileResult.error instanceof DownloadError) {
				throw fileResult.error.data;
			} else if (fileResult.error instanceof InvalidFileKeyError) {
				throw fileResult.error;
			} else {
				return fileResult.error satisfies never;
			}
		}

		const file = fileResult.value;
		const isConvertibleImage = isMimeImage(
			file.mime,
			'sharp-convertible-image-with-bmp',
		);
		const isAnimationConvertibleImage = isMimeImage(
			file.mime,
			'sharp-animation-convertible-image-with-bmp',
		);

		try {
			const imageExpected =
				opts.emoji || opts.avatar || opts.static || opts.preview || opts.badge;
			if (imageExpected && !isConvertibleImage) {
				// 画像ではないなら404でお茶を濁す
				throw new StatusError('Unexpected mime', 404);
			}

			let image: {
				data: Buffer | fs.ReadStream | Sharp;
				type: string;
				ext: string | null;
			} | null = null;

			if (opts.emoji || opts.avatar) {
				if (isAnimationConvertibleImage || opts.static) {
					const data = (
						await sharpBmp(file.path, file.mime, { animated: !opts.static })
					)
						.resize({
							height: opts.emoji ? 128 : 320,
							withoutEnlargement: true,
						})
						.webp(webpDefault);

					image = {
						data,
						ext: 'webp',
						type: 'image/webp',
					};
				} else {
					image = {
						data: fs.createReadStream(file.path),
						ext: file.ext,
						type: file.mime,
					};
				}
			} else {
				if (opts.static) {
					image = this.imageProcessingService.convertSharpToWebpStream(
						await sharpBmp(file.path, file.mime),
						498,
						422,
					);
				} else if (opts.preview) {
					image = this.imageProcessingService.convertSharpToWebpStream(
						await sharpBmp(file.path, file.mime),
						200,
						200,
					);
				} else if (opts.badge) {
					const mask = (await sharpBmp(file.path, file.mime))
						.resize(96, 96, {
							fit: 'contain',
							position: 'centre',
							withoutEnlargement: false,
						})
						.greyscale()
						.normalise()
						.linear(1.75, -(128 * 1.75) + 128) // 1.75x contrast
						.flatten({ background: '#000' })
						.toColorspace('b-w');

					const stats = await mask.clone().stats();

					if (stats.entropy < 0.1) {
						// エントロピーがあまりない場合は404にする
						throw new StatusError('Skip to provide badge', 404);
					}

					const data = sharp({
						create: {
							width: 96,
							height: 96,
							channels: 4,
							background: { r: 0, g: 0, b: 0, alpha: 0 },
						},
					})
						.pipelineColorspace('b-w')
						.boolean(await mask.png().toBuffer(), 'eor');

					image = {
						data: await data.png().toBuffer(),
						ext: 'png',
						type: 'image/png',
					};
				} else if (file.mime === 'image/svg+xml') {
					image = this.imageProcessingService.convertToWebpStream(
						file.path,
						2048,
						2048,
					);
				} else if (
					!file.mime.startsWith('image/') ||
					!FILE_TYPE_BROWSERSAFE.includes(file.mime)
				) {
					throw new StatusError('Rejected type', 403, 'Rejected type');
				} else {
					if (range && 'file' in file && file.file.size > 0) {
						const { start, end, chunksize } = chunk(range, file.file.size);

						image = {
							data: fs.createReadStream(file.path, { start, end }),
							ext: file.ext,
							type: file.mime,
						};

						reply.header(
							'Content-Range',
							`bytes ${start}-${end}/${file.file.size}`,
						);
						reply.header('Accept-Ranges', 'bytes');
						reply.header('Content-Length', chunksize);
					} else {
						image = {
							data: fs.createReadStream(file.path),
							ext: file.ext,
							type: file.mime,
						};
					}
				}
			}

			if (!(file instanceof InternalFile)) {
				if ('pipe' in image.data && typeof image.data.pipe === 'function') {
					// image.dataがstreamなら、stream終了後にcleanup
					image.data.on('end', file.cleanup);
					image.data.on('close', file.cleanup);
				} else {
					// image.dataがstreamでないなら直ちにcleanup
					file.cleanup();
				}
			}

			reply.header('Content-Type', image.type);
			reply.header('Cache-Control', 'max-age=31536000, immutable');
			reply.header(
				'Content-Disposition',
				contentDisposition('inline', correctFilename(file.filename, image.ext)),
			);
			return image.data;
		} catch (e) {
			if (!(file instanceof InternalFile)) file.cleanup();
			throw e;
		}
	}
}
