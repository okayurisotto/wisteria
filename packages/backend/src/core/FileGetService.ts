/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { Config } from '@/config.js';
import type { MiDriveFile, DriveFilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { createTemp } from '@/misc/create-temp.js';
import { DownloadService } from '@/core/DownloadService.js';
import { InternalStorageService } from '@/core/InternalStorageService.js';
import { FileInfoService } from '@/core/FileInfoService.js';

type Result<T, U> = { ok: true; value: T } | { ok: false; error: U };

export class DownloadError extends Error {
	private readonly symbol = Symbol();

	public constructor(public readonly data: unknown) {
		super();
	}
}

/**
 * HTTPレスポンスステータスコードは204に対応する形で実装されていた。
 *
 * @todo 実装経緯を探る
 */
export class UnknownError extends Error {
	private readonly symbol = Symbol();
}

/**
 * HTTPレスポンスステータスコードは400に対応する形で実装されていた。
 */
export class InvalidFileKeyError extends Error {
	private readonly symbol = Symbol();
}

/**
 * HTTPレスポンスステータスコードは404に対応する形で実装されていた。
 */
export class DatabaseRecordNotFoundError extends Error {
	private readonly symbol = Symbol();
}

export type FileRole = 'thumbnail' | 'webpublic' | 'original';

export class InternalFile {
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

export class DownloadedRemoteFile {
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

export class RemoteFile extends DownloadedRemoteFile {
	public readonly fileRole: FileRole;
	public readonly file: MiDriveFile;
	public readonly url: string;

	public constructor(opts: {
		filename: string;
		mime: string;
		ext: string | null;
		path: string;
		cleanup: () => void;
		fileRole: FileRole;
		file: MiDriveFile;
		url: string;
	}) {
		super(opts);
		this.fileRole = opts.fileRole;
		this.file = opts.file;
		this.url = opts.url;
	}
}

@Injectable()
export class FileGetService {
	public constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly fileInfoService: FileInfoService,
		private readonly downloadService: DownloadService,
		private readonly internalStorageService: InternalStorageService,
	) {}

	public async getFromUrl(
		url: string,
	): Promise<
		Result<
			InternalFile | DownloadedRemoteFile | RemoteFile,
			| DownloadError
			| UnknownError
			| DatabaseRecordNotFoundError
			| InvalidFileKeyError
		>
	> {
		if (url.startsWith(`${this.config.url}/files/`)) {
			const key = url.replace(`${this.config.url}/files/`, '').split('/', 1)[0];

			if (key === undefined) {
				return {
					ok: false,
					error: new InvalidFileKeyError(),
				};
			} else {
				return await this.getFromKey(key);
			}
		} else {
			return await this.downloadRemoteFile(url);
		}
	}

	/**
	 * @param key accessKey or thumbnailAccessKey or webpublicAccesKey
	 */
	public async getFromKey(
		key: string,
	): Promise<
		Result<
			InternalFile | RemoteFile,
			DownloadError | UnknownError | DatabaseRecordNotFoundError
		>
	> {
		// Fetch drive file
		const file = await this.driveFilesRepository
			.createQueryBuilder('file')
			.where('file.accessKey = :accessKey', { accessKey: key })
			.orWhere('file.thumbnailAccessKey = :thumbnailAccessKey', {
				thumbnailAccessKey: key,
			})
			.orWhere('file.webpublicAccessKey = :webpublicAccessKey', {
				webpublicAccessKey: key,
			})
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
					error: new UnknownError(),
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

	private async downloadRemoteFile(
		url: string,
	): Promise<Result<DownloadedRemoteFile, DownloadError>> {
		const result = await this.downloadFromUrl(url);
		if (!result.ok) return result;

		const file = result.value;
		const { mime, ext } = await this.fileInfoService.detectType(file.path);

		return {
			ok: true,
			value: new DownloadedRemoteFile({
				path: file.path,
				filename: file.filename,
				mime,
				ext,
				cleanup: file.cleanup,
			}),
		};
	}

	private async downloadFromUrl(
		url: string,
	): Promise<
		Result<
			{ path: string; filename: string; cleanup: () => void },
			DownloadError
		>
	> {
		const [path, cleanup] = await createTemp();

		try {
			const { filename } = await this.downloadService.downloadUrl(url, path);
			return { ok: true, value: { path, cleanup, filename } };
		} catch (error: unknown) {
			cleanup();
			return { ok: false, error: new DownloadError(error) };
		}
	}
}
