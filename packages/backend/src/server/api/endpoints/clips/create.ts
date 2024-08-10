/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { MiClip } from '@/models/_.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { ApiError } from '@/server/api/error.js';
import { ClipService } from '@/core/ClipService.js';
import { z } from 'zod';
import { ClipSchema } from '@/models/zod/clip.js';

export const meta = {
	tags: ['clips'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:account',

	res: ClipSchema,

	errors: {
		tooManyClips: {
			message: 'You cannot create clip any more.',
			code: 'TOO_MANY_CLIPS',
			id: '920f7c2d-6208-4b76-8082-e632020f5883',
		},
	},
} as const;

export const paramDef = z.object({
	name: z.string().min(1).max(100),
	isPublic: z.boolean().default(false),
	description: z.string().min(1).max(2048).nullable().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly clipEntityService: ClipEntityService,
		private readonly clipService: ClipService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let clip: MiClip;
			try {
				clip = await this.clipService.create(me, ps.name, ps.isPublic, ps.description ?? null);
			} catch (e) {
				if (e instanceof ClipService.TooManyClipsError) {
					throw new ApiError(meta.errors.tooManyClips);
				}
				throw e;
			}
			return await this.clipEntityService.pack(clip, me);
		});
	}
}
