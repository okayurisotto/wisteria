/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { SearchService } from '@/core/SearchService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { ApiError } from '../../error.js';
import { RoleUserService } from '@/core/RoleUserService.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	res: NoteSchema.array(),

	errors: {
		unavailable: {
			message: 'Search of notes unavailable.',
			code: 'UNAVAILABLE',
			id: '0b44998d-77aa-4427-80d0-d2c9b8523011',
		},
	},
} as const;

export const paramDef = z.object({
	query: z.string(),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	limit: z.number().int().min(1).max(100).default(10),
	offset: z.number().int().default(0),
	host: z.string().describe('The local host is represented with `.`.').optional(),
	userId: IdSchema.nullable().optional(),
	channelId: IdSchema.nullable().optional(),
});

// TODO: ロジックをサービスに切り出す

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly noteEntityService: NoteEntityService,
		private readonly searchService: SearchService,
		private readonly roleUserService: RoleUserService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const policies = await this.roleUserService.getUserPolicies(me ? me.id : null);
			if (!policies.canSearchNotes) {
				throw new ApiError(meta.errors.unavailable);
			}

			const notes = await this.searchService.searchNote(ps.query, me, {
				userId: ps.userId,
				channelId: ps.channelId,
				host: ps.host,
			}, {
				untilId: ps.untilId,
				sinceId: ps.sinceId,
				limit: ps.limit,
			});

			return await this.noteEntityService.packMany(notes, me);
		});
	}
}
