/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { DriveFilesRepository, EmojisRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { ApiError } from '../../../error.js';
import { IsNull } from 'typeorm';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji',

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'fc46b5a4-6b92-4c33-ac66-b806659bb5cf',
		},
		duplicateName: {
			message: 'Duplicate name.',
			code: 'DUPLICATE_NAME',
			id: 'f7a3462c-4e6e-4069-8421-b9bd4f4c3975',
		},
	},

	ref: 'EmojiDetailed',
} as const;

export const paramDef = z.object({
	name: z.string(),
	fileId: IdSchema,
	category: z.string().nullable().describe('Use `null` to reset the category.').optional(),
	aliases: z.string().array().optional(),
	license: z.string().nullable().optional(),
	isSensitive: z.boolean().optional(),
	localOnly: z.boolean().optional(),
	roleIdsThatCanBeUsedThisEmojiAsReaction: z.string().array().optional(),
});

// TODO: ロジックをサービスに切り出す

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		@Inject(DI.emojisRepository)
		private readonly emojisRepository: EmojisRepository,

		private readonly customEmojiService: CustomEmojiService,

		private readonly emojiEntityService: EmojiEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const driveFile = await this.driveFilesRepository.findOneBy({ id: ps.fileId });
			if (driveFile == null) throw new ApiError(meta.errors.noSuchFile);
			const isDuplicate = await this.emojisRepository.exists({ where: { name: ps.name, host: IsNull() } });
			if (isDuplicate) throw new ApiError(meta.errors.duplicateName);

			const emoji = await this.customEmojiService.add({
				driveFile,
				name: ps.name,
				category: ps.category ?? null,
				aliases: ps.aliases ?? [],
				host: null,
				license: ps.license ?? null,
				isSensitive: ps.isSensitive ?? false,
				localOnly: ps.localOnly ?? false,
				roleIdsThatCanBeUsedThisEmojiAsReaction: ps.roleIdsThatCanBeUsedThisEmojiAsReaction ?? [],
			}, me);

			return this.emojiEntityService.packDetailed(emoji);
		});
	}
}
