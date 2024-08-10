/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { DriveFilesRepository, UsersRepository } from '@/models/_.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { DI } from '@/di-symbols.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { IdService } from '@/core/IdService.js';
import { ApiError } from '../../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:drive',

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'caf3ca38-c6e5-472e-a30c-b05377dcc240',
		},
	},

	res: z.object({
		id: IdSchema.optional(),
		createdAt: z.string()/* format: date-time */.optional(),
		userId: IdSchema.nullable().optional(),
		userHost: z.string().nullable().describe('The local host is represented with `null`.').optional(),
		md5: z.string()/* example: "15eca7fba0480996e2245f5185bf39f2" *//* format: md5 */.optional(),
		name: z.string()/* example: "lenna.jpg" */.optional(),
		type: z.string()/* example: "image/jpeg" */.optional(),
		size: z.number()/* example: 51469 */.optional(),
		comment: z.string().nullable().optional(),
		blurhash: z.string().nullable().optional(),
		properties: z.object({
			width: z.number().optional(),
			height: z.number().optional(),
			orientation: z.number().optional(),
			avgColor: z.string().optional(),
		}),
		storedInternal: z.boolean().nullable()/* example: true */.optional(),
		url: z.string().nullable()/* format: url */.optional(),
		thumbnailUrl: z.string().nullable()/* format: url */.optional(),
		webpublicUrl: z.string().nullable()/* format: url */.optional(),
		accessKey: z.string().nullable().optional(),
		thumbnailAccessKey: z.string().nullable().optional(),
		webpublicAccessKey: z.string().nullable().optional(),
		uri: z.string().nullable().optional(),
		src: z.string().nullable().optional(),
		folderId: IdSchema.nullable().optional(),
		isSensitive: z.boolean().optional(),
		isLink: z.boolean().optional(),
	}),
} as const;

export const paramDef = z.union([
	z.object({
		fileId: IdSchema,
		url: z.never().optional(),
	}),
	z.object({
		fileId: z.never().optional(),
		url: z.string(),
	}),
]);

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		private readonly roleUserService: RoleUserService,
		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const file = ps.fileId
				? await this.driveFilesRepository.findOneBy({ id: ps.fileId })
				: await this.driveFilesRepository.findOne({
					where: [{
						url: ps.url,
					}, {
						thumbnailUrl: ps.url,
					}, {
						webpublicUrl: ps.url,
					}],
				});

			if (file == null) {
				throw new ApiError(meta.errors.noSuchFile);
			}

			const owner = file.userId
				? await this.usersRepository.findOneByOrFail({
					id: file.userId,
				})
				: null;

			const iAmModerator = await this.roleUserService.isModerator(me);
			const ownerIsModerator = owner ? await this.roleUserService.isModerator(owner) : false;

			return {
				id: file.id,
				userId: file.userId,
				userHost: file.userHost,
				isLink: file.isLink,
				maybePorn: file.maybePorn,
				maybeSensitive: file.maybeSensitive,
				isSensitive: file.isSensitive,
				folderId: file.folderId,
				src: file.src,
				uri: file.uri,
				webpublicAccessKey: file.webpublicAccessKey,
				thumbnailAccessKey: file.thumbnailAccessKey,
				accessKey: file.accessKey,
				webpublicType: file.webpublicType,
				webpublicUrl: file.webpublicUrl,
				thumbnailUrl: file.thumbnailUrl,
				url: file.url,
				storedInternal: file.storedInternal,
				properties: file.properties,
				blurhash: file.blurhash,
				comment: file.comment,
				size: file.size,
				type: file.type,
				name: file.name,
				md5: file.md5,
				createdAt: this.idService.parse(file.id).date.toISOString(),
				requestIp: iAmModerator ? file.requestIp : null,
				requestHeaders: iAmModerator && !ownerIsModerator ? file.requestHeaders : null,
			};
		});
	}
}
