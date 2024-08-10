/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { ClipService } from '@/core/ClipService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['clips'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:account',

	errors: {
		noSuchClip: {
			message: 'No such clip.',
			code: 'NO_SUCH_CLIP',
			id: 'b4d92d70-b216-46fa-9a3f-a8c811699257',
		},
	},

	res: ClipSchema,
} as const;

export const paramDef = z.object({
	clipId: IdSchema,
	name: z.string().min(1).max(100),
	isPublic: z.boolean().optional(),
	description: z.string().min(1).max(2048).nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly clipService: ClipService,

		private readonly clipEntityService: ClipEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await this.clipService.update(me, ps.clipId, ps.name, ps.isPublic, ps.description);
			} catch (e) {
				if (e instanceof ClipService.NoSuchClipError) {
					throw new ApiError(meta.errors.noSuchClip);
				}
				throw e;
			}

			return await this.clipEntityService.pack(ps.clipId, me);
		});
	}
}
