/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import type { } from '@/models/Blocking.js';
import type { MiHashtag } from '@/models/Hashtag.js';
import type { z } from 'zod';
import type { HashtagSchema } from '@/models/zod/hashtag';

@Injectable()
export class HashtagEntityService {
	public async pack(
		src: MiHashtag,
	): Promise<z.infer<typeof HashtagSchema>> {
		return {
			tag: src.name,
			mentionedUsersCount: src.mentionedUsersCount,
			mentionedLocalUsersCount: src.mentionedLocalUsersCount,
			mentionedRemoteUsersCount: src.mentionedRemoteUsersCount,
			attachedUsersCount: src.attachedUsersCount,
			attachedLocalUsersCount: src.attachedLocalUsersCount,
			attachedRemoteUsersCount: src.attachedRemoteUsersCount,
		};
	}

	public packMany(
		hashtags: MiHashtag[],
	) {
		return Promise.all(hashtags.map(x => this.pack(x)));
	}
}
