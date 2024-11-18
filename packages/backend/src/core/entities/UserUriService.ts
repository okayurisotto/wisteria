/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type {
	MiLocalUser,
	MiPartialLocalUser,
	MiPartialRemoteUser,
	MiRemoteUser,
} from '@/models/User.js';
import { isRemoteUser } from '@/misc/isRemoteUser.js';

@Injectable()
export class UserUriService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {}

	public genLocalUserUri(userId: string): string {
		return `${this.config.url}/users/${userId}`;
	}

	public getUserUri(
		user: MiLocalUser | MiPartialLocalUser | MiRemoteUser | MiPartialRemoteUser,
	): string {
		return isRemoteUser(user) ? user.uri : this.genLocalUserUri(user.id);
	}
}
