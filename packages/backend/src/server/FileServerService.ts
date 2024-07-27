/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import * as fs from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import rename from 'rename';
import sharp, { type Sharp } from 'sharp';
import { sharpBmp } from '@misskey-dev/sharp-read-bmp';
import type { Config } from '@/config.js';
import type { MiDriveFile, DriveFilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { createTemp } from '@/misc/create-temp.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { StatusError } from '@/misc/status-error.js';
import type Logger from '@/logger.js';
import { DownloadService } from '@/core/DownloadService.js';
import { ImageProcessingService, webpDefault } from '@/core/ImageProcessingService.js';
import { VideoProcessingService } from '@/core/VideoProcessingService.js';
import { InternalStorageService } from '@/core/InternalStorageService.js';
import { contentDisposition } from '@/misc/content-disposition.js';
import { FileInfoService } from '@/core/FileInfoService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { isMimeImage } from '@/misc/is-mime-image.js';
import { correctFilename } from '@/misc/correct-filename.js';
import { handleRequestRedirectToOmitSearch } from '@/misc/fastify-hook-handlers.js';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';
import { ASSETS_DIR, DUMMY_PNG_FILE } from '@/path.js';
import { envOption } from '@/env.js';
import { z } from 'zod';

type Result<T, U> = { ok: true; value: T } | { ok: false, error: U };

class DownloadError extends Error {
	public readonly symbol = Symbol();

	public constructor(public readonly data: unknown) {
		super();
	}
}

/** 404 */
class DatabaseRecordNotFoundError extends Error {
	public readonly symbol = Symbol();
}

/** 204 */
class TodoError extends Error {
	public readonly symbol = Symbol();
}

/** 400 */
class InvalidFileKeyError extends Error {
	public readonly symbol = Symbol();
}

type FileRole = 'thumbnail' | 'webpublic' | 'original';

class InternalFile {
	public readonly state = 'stored_internal';
	public readonly fileRole: FileRole;
	public readonly file: MiDriveFile;
	public readonly mime: string;
	public readonly ext: string | null;
	public readonly path: string;

	public get filename(): string {
		return this.file.name;
	}

	public constructor(opts: {
		fileRole: FileRole;
		file: MiDriveFile;
		mime: string;
		ext: string | null;
		path: string;
	}) {
		this.fileRole = opts.fileRole;
		this.file = opts.file;
		this.mime = opts.mime;
		this.ext = opts.ext;
		this.path = opts.path;
	}
}

class DownloadedRemoteFile {
	public readonly state = 'remote';
	public readonly filename: string;
	public readonly mime: string;
	public readonly ext: string | null;
	public readonly path: string;
	public readonly cleanup: () => void;

	public constructor(opts: {
		filename: string;
		mime: string;
		ext: string | null;
		path: string;
		cleanup: () => void;
	}) {
		this.filename = opts.filename;
		this.mime = opts.mime;
		this.ext = opts.ext;
		this.path = opts.path;
		this.cleanup = opts.cleanup;
	}
}

class RemoteFile extends DownloadedRemoteFile {
	public readonly fileRole: FileRole;
	public readonly file: MiDriveFile;
	public readonly url: string;

	public constructor(opts: {
		filename: string,
		mime: string,
		ext: string | null,
		path: string,
		cleanup: () => void,
		fileRole: FileRole,
		file: MiDriveFile,
		url: string,
	}) {
		super(opts);
		this.fileRole = opts.fileRole;
		this.file = opts.file;
		this.url = opts.url;
	}
}

type Range<T> = { start: T; end: T } | { start: T; end: null }

type RangeHeaderValue<T> =
	| { unit: string; suffix: true; length: T }
	| { unit: string; suffix: false; ranges: Range<T>[] };

const parseRangeHeaderValue = (value: string): RangeHeaderValue<string> | null => {
	const [unit, rangesPart] = value.split('=', 2);
	if (unit === undefined) return null;
	if (rangesPart === undefined) return null;

	if (rangesPart.startsWith('-')) {
		// suffix length
		return {
			unit,
			suffix: true,
			length: rangesPart.substring('-'.length),
		};
	}

	const ranges = rangesPart
		.split(', ')
		.map<Range<string> | null>((range) => {
			const [start, end] = range.split('-', 1);

			if (start === undefined) {
				return null;
			} else {
				return { start, end: end ?? null };
			}
		})
		.filter(v => v !== null);

	return { unit, suffix: false, ranges };
};

const safeParseInt = (value: string, radix = 10): number | null => {
	const result = parseInt(value, radix);
	if (Number.isNaN(result)) return null;
	return result;
};

const parseBytesRangeHeaderValue = (value: string): RangeHeaderValue<number> | null => {
	const UNIT = 'bytes';

	const result = parseRangeHeaderValue(value);
	if (result === null) return null;
	if (result.unit !== UNIT) return null;

	if (result.suffix) {
		const length = safeParseInt(result.length, 10);
		if (length === null) return null;

		return {
			unit: UNIT,
			suffix: true,
			length,
		};
	} else {
		const ranges = result.ranges
			.map<Range<number> | null>((range) => {
				const start = safeParseInt(range.start, 10);
				if (start === null) return null;

				if (range.end === null) {
					return { start, end: null };
				} else {
					const end = safeParseInt(range.end, 10);
					if (end === null) return null;
					return { start, end };
				}
			})
			.filter(v => v !== null);

		return {
			unit: UNIT,
			suffix: false,
			ranges: ranges,
		};
	}
};

const chunk = (range: Range<number>, filesize: number) => {
	const end = range.end !== null ? Math.min(range.end, filesize) : filesize;

	return {
		start: range.start,
		end: end,
		chunksize: end - range.start + 1,
	};
};

@Injectable()
export class FileServerService {
	private readonly logger: Logger;

	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly fileInfoService: FileInfoService,
		private readonly downloadService: DownloadService,
		private readonly imageProcessingService: ImageProcessingService,
		private readonly videoProcessingService: VideoProcessingService,
		private readonly internalStorageService: InternalStorageService,
		private readonly loggerService: LoggerService,
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

		fastify.register((fastify, options, done) => {
			fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);

			fastify.get('/files/app-default.jpg', (request, reply) => {
				const file = fs.createReadStream(DUMMY_PNG_FILE);
				reply.header('Content-Type', 'image/jpeg');
				reply.header('Cache-Control', 'max-age=31536000, immutable');
				return reply.send(file);
			});

			fastify.get<{ Params: { key: string; } }>('/files/:key', async (request, reply) => {
				try {
					return await this.sendDriveFile(request.params.key, request.headers.range ?? null, reply);
				} catch (err: unknown) {
					this.errorHandler(request, reply, err);
					return;
				}
			});

			fastify.get<{ Params: { key: string; } }>('/files/:key/*', async (request, reply) => {
				return await reply.redirect(301, `${this.config.url}/files/${request.params.key}`);
			});

			done();
		});

		fastify.get<{
			Params: { url: string; };
			Querystring: { url?: string; };
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

	private errorHandler(request: FastifyRequest<{ Params?: { [x: string]: unknown }; Querystring?: { [x: string]: unknown }; }>, reply: FastifyReply, err?: unknown): void {
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

		const fileResult = await this.getFileFromKey(key).then();

		if (!fileResult.ok) {
			if (fileResult.error instanceof DatabaseRecordNotFoundError) {
				reply.code(404);
				reply.header('Cache-Control', 'max-age=86400');
				reply.sendFile('/dummy.png', ASSETS_DIR);
				return;
			} else if (fileResult.error instanceof TodoError) {
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

	private async proxyHandler(request: FastifyRequest, reply: FastifyReply) {
		const query = z.object({
			url: z.string().optional(),
			origin: z.string().optional(),
			emoji: z.string().optional(),
			avatar: z.string().optional(),
			static: z.string().optional(),
			preview: z.string().optional(),
			badge: z.string().optional(),
		}).parse(request.query);

		const params = z.object({
			url: z.string().optional(),
		}).parse(request.params);

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

		const fileResult = await this.getFile(opts.url);

		if (!fileResult.ok) {
			if (fileResult.error instanceof DatabaseRecordNotFoundError) {
				reply.code(404);
				reply.header('Cache-Control', 'max-age=86400');
				return reply.sendFile('/dummy.png', ASSETS_DIR);
			} else if (fileResult.error instanceof TodoError) {
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
		const isConvertibleImage = isMimeImage(file.mime, 'sharp-convertible-image-with-bmp');
		const isAnimationConvertibleImage = isMimeImage(file.mime, 'sharp-animation-convertible-image-with-bmp');

		try {
			const imageExpected = opts.emoji || opts.avatar || opts.static || opts.preview || opts.badge;
			if (imageExpected && !isConvertibleImage) {
				// 画像でないなら404でお茶を濁す
				throw new StatusError('Unexpected mime', 404);
			}

			let image: {
				data: Buffer | fs.ReadStream | Sharp;
				type: string;
				ext: string | null;
			} | null = null;

			if (opts.emoji || opts.avatar) {
				if (isAnimationConvertibleImage || opts.static) {
					const data = (await sharpBmp(file.path, file.mime, { animated: opts.static }))
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
					image = this.imageProcessingService.convertSharpToWebpStream(await sharpBmp(file.path, file.mime), 498, 422);
				} else if (opts.preview) {
					image = this.imageProcessingService.convertSharpToWebpStream(await sharpBmp(file.path, file.mime), 200, 200);
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
						create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
					})
						.pipelineColorspace('b-w')
						.boolean(await mask.png().toBuffer(), 'eor');

					image = {
						data: await data.png().toBuffer(),
						ext: 'png',
						type: 'image/png',
					};
				} else if (file.mime === 'image/svg+xml') {
					image = this.imageProcessingService.convertToWebpStream(file.path, 2048, 2048);
				} else if (!file.mime.startsWith('image/') || !FILE_TYPE_BROWSERSAFE.includes(file.mime)) {
					throw new StatusError('Rejected type', 403, 'Rejected type');
				} else {
					if (range && 'file' in file && file.file.size > 0) {
						const { start, end, chunksize } = chunk(range, file.file.size);

						image = {
							data: fs.createReadStream(file.path, { start, end }),
							ext: file.ext,
							type: file.mime,
						};

						reply.header('Content-Range', `bytes ${start}-${end}/${file.file.size}`);
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
			reply.header('Content-Disposition', contentDisposition('inline', correctFilename(file.filename, image.ext)));
			return image.data;
		} catch (e) {
			if (!(file instanceof InternalFile)) file.cleanup();
			throw e;
		}
	}

	private async getFile(url: string): Promise<Result<
		InternalFile | DownloadedRemoteFile | RemoteFile,
		DownloadError | TodoError | DatabaseRecordNotFoundError | InvalidFileKeyError
	>> {
		if (url.startsWith(`${this.config.url}/files/`)) {
			const key = url.replace(`${this.config.url}/files/`, '').split('/', 1)[0];

			if (key === undefined) {
				return {
					ok: false,
					error: new InvalidFileKeyError(),
				};
			} else {
				return await this.getFileFromKey(key);
			}
		} else {
			return await this.downloadRemoteFile(url);
		}
	}

	private async downloadRemoteFile(url: string): Promise<Result<DownloadedRemoteFile, DownloadError>> {
		const downloadResult = await this.downloadFromUrl(url);
		if (!downloadResult.ok) return downloadResult;

		const { mime, ext } = await this.fileInfoService.detectType(downloadResult.value.path);

		return {
			ok: true,
			value: new DownloadedRemoteFile({
				path: downloadResult.value.path,
				filename: downloadResult.value.filename,
				mime,
				ext,
				cleanup: downloadResult.value.cleanup,
			}),
		};
	}

	private async downloadFromUrl(url: string): Promise<Result<{ path: string; filename: string; cleanup: () => void }, DownloadError>> {
		const [path, cleanup] = await createTemp();

		try {
			const { filename } = await this.downloadService.downloadUrl(url, path);
			return { ok: true, value: { path, cleanup, filename } };
		} catch (error: unknown) {
			cleanup();
			return { ok: false, error: new DownloadError(error) };
		}
	}

	private async getFileFromKey(key: string): Promise<Result<InternalFile | RemoteFile, DownloadError | TodoError | DatabaseRecordNotFoundError>> {
		// Fetch drive file
		const file = await this.driveFilesRepository.createQueryBuilder('file')
			.where('file.accessKey = :accessKey', { accessKey: key })
			.orWhere('file.thumbnailAccessKey = :thumbnailAccessKey', { thumbnailAccessKey: key })
			.orWhere('file.webpublicAccessKey = :webpublicAccessKey', { webpublicAccessKey: key })
			.getOne();

		if (file === null) {
			return {
				ok: false,
				error: new DatabaseRecordNotFoundError(),
			};
		}

		const fileRole: FileRole = (() => {
			if (file.accessKey === key) return 'original';
			if (file.thumbnailAccessKey === key) return 'thumbnail';
			if (file.webpublicAccessKey === key) return 'webpublic';

			// ???
			throw new Error();
		})();

		if (file.storedInternal) {
			const path = this.internalStorageService.resolvePath(key);

			if (fileRole === 'original') {
				// 古いファイルは修正前のmimeを持っているのでできるだけ修正してあげる
				const mime = this.fileInfoService.fixMime(file.type);
				return {
					ok: true,
					value: new InternalFile({ fileRole, file, mime, ext: null, path }),
				};
			} else {
				const { mime, ext } = await this.fileInfoService.detectType(path);
				return {
					ok: true,
					value: new InternalFile({ fileRole, file, mime, ext, path }),
				};
			}
		} else {
			if (!file.isLink || file.uri === null) {
				return {
					ok: false,
					error: new TodoError(),
				};
			}

			const result = await this.downloadRemoteFile(file.uri);

			if (result.ok) {
				return {
					ok: true,
					value: new RemoteFile({
						mime: result.value.mime,
						ext: result.value.ext,
						path: result.value.path,
						cleanup: result.value.cleanup,

						url: file.uri,
						fileRole,
						file,
						filename: file.name,
					}),
				};
			} else {
				return result;
			}
		}
	}
}
