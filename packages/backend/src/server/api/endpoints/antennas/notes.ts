/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { NotesRepository, AntennasRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteReadService } from '@/core/NoteReadService.js';
import { DI } from '@/di-symbols.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { trackPromise } from '@/misc/promise-tracker.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { IdSchema } from '@/models/zod/IdSchema.js';
import { NoteSchema } from '@/models/zod/note.js';
import { RiverflowService } from '@/core/RiverflowService.js';

export const meta = {
	tags: ['antennas', 'account', 'notes'],

	requireCredential: true,

	kind: 'read:account',

	errors: {
		noSuchAntenna: {
			message: 'No such antenna.',
			code: 'NO_SUCH_ANTENNA',
			id: '850926e0-fd3b-49b6-b69a-b28a5dbd82fe',
		},
	},

	res: NoteSchema.array(),
} as const;

export const paramDef = z.object({
	antennaId: IdSchema,
	limit: z.number().int().min(1).max(100).default(10),
	sinceId: IdSchema.optional(),
	untilId: IdSchema.optional(),
	sinceDate: z.number().int().optional(),
	untilDate: z.number().int().optional(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.antennasRepository)
		private readonly antennasRepository: AntennasRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly queryService: QueryService,
		private readonly noteReadService: NoteReadService,
		private readonly globalEventService: GlobalEventService,
		private readonly riverflowService: RiverflowService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const untilId = ps.untilId ?? ps.untilDate ?? null;
			const sinceId = ps.sinceId ?? ps.sinceDate ?? null;

			const antenna = await this.antennasRepository.findOneBy({
				id: ps.antennaId,
				userId: me.id,
			});

			if (antenna === null) {
				throw new ApiError(meta.errors.noSuchAntenna);
			}

			// falseだった場合はアンテナの配信先が増えたことを通知したい
			const needPublishEvent = !antenna.isActive;

			antenna.isActive = true;
			antenna.lastUsedAt = new Date();
			trackPromise(this.antennasRepository.update(antenna.id, antenna));

			if (needPublishEvent) {
				this.globalEventService.publishInternalEvent('antennaUpdated', antenna);
			}

			const noteIds = await this.riverflowService.list(`riverflow:antenna:${antenna.id}`, sinceId, untilId, 0, ps.limit);
			if (noteIds.length === 0) {
				return [];
			}

			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.id IN (:...noteIds)', { noteIds: noteIds })
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');

			this.queryService.generateVisibilityQuery(query, me);
			this.queryService.generateMutedUserQuery(query, me);
			this.queryService.generateBlockedUserQuery(query, me);

			const notes = await query.getMany();
			if (sinceId != null && untilId == null) {
				notes.sort(({ id: a }, { id: b }) => a < b ? -1 : 1);
			} else {
				notes.sort(({ id: a }, { id: b }) => a < b ? 1 : -1);
			}

			if (notes.length > 0) {
				this.noteReadService.read(me.id, notes);
			}

			return await this.noteEntityService.packMany(notes, me);
		});
	}
}
