/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { PollVotesRepository, NotesRepository } from '@/models/_.js';
import type * as Bull from 'bullmq';
import type { EndedPollNotificationJobData } from '../types.js';
import { NotificationCreateService } from '@/core/NotificationCreateService.js';

@Injectable()
export class EndedPollNotificationProcessorService {
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.pollVotesRepository)
		private readonly pollVotesRepository: PollVotesRepository,

		private readonly notificationCreateService: NotificationCreateService,
	) {}

	public async process(job: Bull.Job<EndedPollNotificationJobData>): Promise<void> {
		const note = await this.notesRepository.findOneBy({ id: job.data.noteId });
		if (note == null || !note.hasPoll) {
			return;
		}

		const votes = await this.pollVotesRepository.createQueryBuilder('vote')
			.select('vote.userId')
			.where('vote.noteId = :noteId', { noteId: note.id })
			.innerJoinAndSelect('vote.user', 'user')
			.andWhere('user.host IS NULL')
			.getMany();

		const userIds = [...new Set([note.userId, ...votes.map(v => v.userId)])];

		for (const userId of userIds) {
			this.notificationCreateService.createNotification(userId, 'pollEnded', {
				noteId: note.id,
			});
		}
	}
}
