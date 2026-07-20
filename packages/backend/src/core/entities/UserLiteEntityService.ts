/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { MiUser } from '@/models/User.js';
import type { UsersRepository, InstancesRepository } from '@/models/_.js';
import { AvatarDecorationService } from '@/core/AvatarDecorationService.js';
import { CustomEmojiPopulateService } from '@/core/CustomEmojiPopulateService.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import type { MeDetailedSchema, UserDetailedNotMeSchema, UserDetailedSchema } from '@/models/zod/user.js';
import type { UserLiteSchema } from '@/models/zod/user-lite.js';
import type { z } from 'zod';

type Refs = {
	MeDetailed: typeof MeDetailedSchema;
	UserDetailedNotMe: typeof UserDetailedNotMeSchema;
	UserDetailed: typeof UserDetailedSchema;
	UserLite: typeof UserLiteSchema;
};

@Injectable()
export class UserLiteEntityService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		private readonly avatarDecorationService: AvatarDecorationService,
		private readonly customEmojiPopulateService: CustomEmojiPopulateService,
		private readonly roleUserService: RoleUserService,
	) {}

	public getIdenticonUrl(user: MiUser): string {
		return `${this.config.url}/identicon/${user.username.toLowerCase()}@${user.host ?? this.config.host}`;
	}

	public async packLite(src: MiUser['id'] | MiUser): Promise<z.infer<Refs['UserLite']>> {
		const user = typeof src === 'object' ? src : await this.usersRepository.findOneByOrFail({ id: src });

		const packed = {
			id: user.id,
			name: user.name,
			username: user.username,
			host: user.host,
			avatarUrl: user.avatarUrl ?? this.getIdenticonUrl(user),
			avatarBlurhash: user.avatarBlurhash,
			avatarDecorations: user.avatarDecorations.length > 0
				? this.avatarDecorationService.getAll().then(decorations => user.avatarDecorations.filter(ud => decorations.some(d => d.id === ud.id)).map(ud => ({
					id: ud.id,
					angle: ud.angle || undefined,
					flipH: ud.flipH || undefined,
					offsetX: ud.offsetX || undefined,
					offsetY: ud.offsetY || undefined,
					url: decorations.find(d => d.id === ud.id)!.url,
				})))
				: [],
			isBot: user.isBot,
			isCat: user.isCat,
			instance: user.host
				? this.instancesRepository.findOneBy({ host: user.host }).then(instance => instance
					? {
							name: instance.name,
							softwareName: instance.softwareName,
							softwareVersion: instance.softwareVersion,
							iconUrl: instance.iconUrl,
							faviconUrl: instance.faviconUrl,
							themeColor: instance.themeColor,
						}
					: undefined)
				: undefined,
			emojis: this.customEmojiPopulateService.populateEmojis(user.emojis, user.host),
			// パフォーマンス上の理由でローカルユーザーのみ
			badgeRoles: user.host == null
				? this.roleUserService.getUserBadgeRoles(user.id).then(rs => rs.sort((a, b) => b.displayOrder - a.displayOrder).map(r => ({
					name: r.name,
					iconUrl: r.iconUrl,
					displayOrder: r.displayOrder,
				})))
				: undefined,
		};

		return await awaitAll(packed);
	}
}
