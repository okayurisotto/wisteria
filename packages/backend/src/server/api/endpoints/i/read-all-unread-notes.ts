/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { NoteUnreadsRepository } from '@/models/_.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';

export const meta = {
	tags: ['account'],

	requireCredential: true,

	kind: 'write:account',
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.noteUnreadsRepository)
		private readonly noteUnreadsRepository: NoteUnreadsRepository,

		private readonly globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Remove documents
			await this.noteUnreadsRepository.delete({
				userId: me.id,
			});

			// 全て既読になったイベントを発行
			this.globalEventService.publishMainStream(me.id, 'readAllUnreadMentions');
			this.globalEventService.publishMainStream(me.id, 'readAllUnreadSpecifiedNotes');
		});
	}
}
