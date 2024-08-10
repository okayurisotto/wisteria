/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DriveService } from '@/core/DriveService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['drive'],

	limit: {
		duration: ms('1hour'),
		max: 60,
	},

	description: 'Request the server to download a new drive file from the specified URL.',

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:drive',
} as const;

export const paramDef = z.object({
	url: z.string(),
	folderId: IdSchema.nullable().optional(),
	isSensitive: z.boolean().default(false),
	comment: z.string().max(512).nullable().default(null),
	marker: z.string().nullable().default(null),
	force: z.boolean().default(false),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly driveFileEntityService: DriveFileEntityService,
		private readonly driveService: DriveService,
		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, user, _1, _2, _3, ip, headers) => {
			this.driveService.uploadFromUrl({ url: ps.url, user, folderId: ps.folderId, sensitive: ps.isSensitive, force: ps.force, comment: ps.comment, requestIp: ip, requestHeaders: headers }).then((file) => {
				this.driveFileEntityService.pack(file, { self: true }).then((packedFile) => {
					this.globalEventService.publishMainStream(user.id, 'urlUploadFinished', {
						marker: ps.marker,
						file: packedFile,
					});
				});
			});
		});
	}
}
