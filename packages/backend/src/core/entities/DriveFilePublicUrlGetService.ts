/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { appendQuery, query } from '@/misc/prelude/url.js';

@Injectable()
export class DriveFilePublicUrlGetService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {}

	public getProxiedUrl(url: string, mode?: 'static' | 'avatar'): string {
		return appendQuery(
			`${this.config.mediaProxy}/${mode ?? 'image'}.webp`,
			query({
				url,
				...(mode ? { [mode]: '1' } : {}),
			}),
		);
	}

	public getPublicUrl(file: MiDriveFile, mode?: 'avatar'): string {
		// static = thumbnail
		// リモートかつメディアプロキシ
		if (
			file.uri != null &&
			file.userHost != null &&
			this.config.externalMediaProxyEnabled
		) {
			return this.getProxiedUrl(file.uri, mode);
		}

		// リモートかつ期限切れはローカルプロキシを試みる
		if (file.uri != null && file.isLink && this.config.proxyRemoteFiles) {
			const key = file.webpublicAccessKey;

			if (key && !key.match('/')) {
				// 古いものはここにオブジェクトストレージキーが入ってるので除外
				const url = `${this.config.url}/files/${key}`;
				if (mode === 'avatar') return this.getProxiedUrl(file.uri, 'avatar');
				return url;
			}
		}

		const url = file.webpublicUrl ?? file.url;

		if (mode === 'avatar') {
			return this.getProxiedUrl(url, 'avatar');
		}
		return url;
	}
}
