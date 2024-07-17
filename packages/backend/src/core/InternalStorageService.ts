/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import * as Path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import { INTERNAL_STORAGE_DIR } from '@/path.js';

@Injectable()
export class InternalStorageService {
	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
	}

	@bindThis
	public resolvePath(key: string) {
		return Path.resolve(INTERNAL_STORAGE_DIR, key);
	}

	@bindThis
	public read(key: string) {
		return fs.createReadStream(this.resolvePath(key));
	}

	@bindThis
	public saveFromPath(key: string, srcPath: string) {
		fs.mkdirSync(INTERNAL_STORAGE_DIR, { recursive: true });
		fs.copyFileSync(srcPath, this.resolvePath(key));
		return `${this.config.url}/files/${key}`;
	}

	@bindThis
	public saveFromBuffer(key: string, data: Buffer) {
		fs.mkdirSync(INTERNAL_STORAGE_DIR, { recursive: true });
		fs.writeFileSync(this.resolvePath(key), data);
		return `${this.config.url}/files/${key}`;
	}

	@bindThis
	public del(key: string) {
		fs.unlink(this.resolvePath(key), () => {});
	}
}
