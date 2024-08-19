/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { DriveFilesRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { deepClone } from '@/misc/clone.js';
import { isMimeImage } from '@/misc/is-mime-image.js';
import { isNotNull } from '@/misc/is-not-null.js';
import { IdService } from '@/core/IdService.js';
import { VideoProcessingService } from '../VideoProcessingService.js';
import { DriveFolderEntityService } from './DriveFolderEntityService.js';
import type { z } from 'zod';
import type { DriveFileSchema } from '@/models/zod/drive-file.js';
import { UserLiteEntityService } from './UserLiteEntityService.js';
import { DriveFilePublicUrlGetService } from './DriveFilePublicUrlGetService.js';

type PackOptions = {
	detail?: boolean;
	self?: boolean;
	withUser?: boolean;
};

@Injectable()
export class DriveFileEntityService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		private readonly driveFolderEntityService: DriveFolderEntityService,
		private readonly videoProcessingService: VideoProcessingService,
		private readonly idService: IdService,
		private readonly userLiteEntityService: UserLiteEntityService,
		private readonly driveFilePublicUrlGetService: DriveFilePublicUrlGetService,
	) {}

	public validateFileName(name: string): boolean {
		return (
			(name.trim().length > 0) &&
			(name.length <= 200) &&
			(!name.includes('\\')) &&
			(!name.includes('/')) &&
			(!name.includes('..'))
		);
	}

	private getPublicProperties(file: MiDriveFile): MiDriveFile['properties'] {
		if (file.properties.orientation != null) {
			const properties = deepClone(file.properties);
			if (file.properties.orientation >= 5) {
				[properties.width, properties.height] = [properties.height, properties.width];
			}
			properties.orientation = undefined;
			return properties;
		}

		return file.properties;
	}

	private getThumbnailUrl(file: MiDriveFile): string | null {
		if (file.type.startsWith('video')) {
			if (file.thumbnailUrl) return file.thumbnailUrl;

			return this.videoProcessingService.getExternalVideoThumbnailUrl(file.webpublicUrl ?? file.url);
		} else if (file.uri != null && file.userHost != null && this.config.externalMediaProxyEnabled) {
			// 動画ではなくリモートかつメディアプロキシ
			return this.driveFilePublicUrlGetService.getProxiedUrl(file.uri, 'static');
		}

		if (file.uri != null && file.isLink && this.config.proxyRemoteFiles) {
			// リモートかつ期限切れはローカルプロキシを試みる
			// 従来は/files/${thumbnailAccessKey}にアクセスしていたが、
			// /filesはメディアプロキシにリダイレクトするようにしたため直接メディアプロキシを指定する
			return this.driveFilePublicUrlGetService.getProxiedUrl(file.uri, 'static');
		}

		const url = file.webpublicUrl ?? file.url;

		return file.thumbnailUrl ?? (isMimeImage(file.type, 'sharp-convertible-image') ? url : null);
	}

	public async calcDriveUsageOf(user: MiUser['id'] | { id: MiUser['id'] }): Promise<number> {
		const id = typeof user === 'object' ? user.id : user;

		const { sum } = await this.driveFilesRepository
			.createQueryBuilder('file')
			.where('file.userId = :id', { id: id })
			.andWhere('file.isLink = FALSE')
			.select('SUM(file.size)', 'sum')
			.getRawOne();

		return parseInt(sum, 10) || 0;
	}

	public async pack(
		src: MiDriveFile['id'] | MiDriveFile,
		options?: PackOptions,
	): Promise<z.infer<typeof DriveFileSchema>> {
		const opts = Object.assign({
			detail: false,
			self: false,
		}, options);

		const file = typeof src === 'object' ? src : await this.driveFilesRepository.findOneByOrFail({ id: src });

		return await awaitAll<z.infer<typeof DriveFileSchema>>({
			id: file.id,
			createdAt: this.idService.parse(file.id).date.toISOString(),
			name: file.name,
			type: file.type,
			md5: file.md5,
			size: file.size,
			isSensitive: file.isSensitive,
			blurhash: file.blurhash,
			properties: opts.self ? file.properties : this.getPublicProperties(file),
			url: opts.self ? file.url : this.driveFilePublicUrlGetService.getPublicUrl(file),
			thumbnailUrl: this.getThumbnailUrl(file),
			comment: file.comment,
			folderId: file.folderId,
			folder: opts.detail && file.folderId
				? this.driveFolderEntityService.pack(file.folderId, {
					detail: true,
				})
				: null,
			userId: opts.withUser ? file.userId : null,
			user: (opts.withUser && file.userId) ? this.userLiteEntityService.packLite(file.userId) : null,
		});
	}

	private async packNullable(
		src: MiDriveFile['id'] | MiDriveFile,
		options?: PackOptions,
	): Promise<z.infer<typeof DriveFileSchema> | null> {
		const opts = Object.assign({
			detail: false,
			self: false,
		}, options);

		const file = typeof src === 'object' ? src : await this.driveFilesRepository.findOneBy({ id: src });
		if (file == null) return null;

		return await awaitAll<z.infer<typeof DriveFileSchema>>({
			id: file.id,
			createdAt: this.idService.parse(file.id).date.toISOString(),
			name: file.name,
			type: file.type,
			md5: file.md5,
			size: file.size,
			isSensitive: file.isSensitive,
			blurhash: file.blurhash,
			properties: opts.self ? file.properties : this.getPublicProperties(file),
			url: opts.self ? file.url : this.driveFilePublicUrlGetService.getPublicUrl(file),
			thumbnailUrl: this.getThumbnailUrl(file),
			comment: file.comment,
			folderId: file.folderId,
			folder: opts.detail && file.folderId
				? this.driveFolderEntityService.pack(file.folderId, {
					detail: true,
				})
				: null,
			userId: opts.withUser ? file.userId : null,
			user: (opts.withUser && file.userId) ? this.userLiteEntityService.packLite(file.userId) : null,
		});
	}

	public async packMany(
		files: MiDriveFile[],
		options?: PackOptions,
	): Promise<z.infer<typeof DriveFileSchema>[]> {
		const items = await Promise.all(files.map(f => this.packNullable(f, options)));
		return items.filter((x): x is z.infer<typeof DriveFileSchema> => x != null);
	}

	public async packManyByIdsMap(
		fileIds: MiDriveFile['id'][],
		options?: PackOptions,
	): Promise<Map<z.infer<typeof DriveFileSchema>['id'], z.infer<typeof DriveFileSchema> | null>> {
		if (fileIds.length === 0) return new Map();
		const files = await this.driveFilesRepository.findBy({ id: In(fileIds) });
		const packedFiles = await this.packMany(files, options);
		const map = new Map<z.infer<typeof DriveFileSchema>['id'], z.infer<typeof DriveFileSchema> | null>(packedFiles.map(f => [f.id, f]));
		for (const id of fileIds) {
			if (!map.has(id)) map.set(id, null);
		}
		return map;
	}

	public async packManyByIds(
		fileIds: MiDriveFile['id'][],
		options?: PackOptions,
	): Promise<z.infer<typeof DriveFileSchema>[]> {
		if (fileIds.length === 0) return [];
		const filesMap = await this.packManyByIdsMap(fileIds, options);
		return fileIds.map(id => filesMap.get(id)).filter(isNotNull);
	}
}
