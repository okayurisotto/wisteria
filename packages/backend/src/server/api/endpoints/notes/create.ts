/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as ms from '@/misc/ms.js';
import { In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, NotesRepository, BlockingsRepository, DriveFilesRepository, ChannelsRepository } from '@/models/_.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import type { MiNote } from '@/models/Note.js';
import type { MiChannel } from '@/models/Channel.js';
import { MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { DI } from '@/di-symbols.js';
import { isPureRenote } from '@/misc/is-pure-renote.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { NoteReactionAcceptanceSchema, NoteSchema, NoteVisibilitySchema } from '@/models/zod/note.js';
import { IdSchema } from '@/models/zod/IdSchema.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	prohibitMoved: true,

	limit: {
		duration: ms.hours(1),
		max: 300,
	},

	kind: 'write:notes',

	res: z.object({
		createdNote: NoteSchema,
	}),

	errors: {
		noSuchRenoteTarget: {
			message: 'No such renote target.',
			code: 'NO_SUCH_RENOTE_TARGET',
			id: 'b5c90186-4ab0-49c8-9bba-a1f76c282ba4',
		},

		cannotReRenote: {
			message: 'You can not Renote a pure Renote.',
			code: 'CANNOT_RENOTE_TO_A_PURE_RENOTE',
			id: 'fd4cc33e-2a37-48dd-99cc-9b806eb2031a',
		},

		cannotRenoteDueToVisibility: {
			message: 'You can not Renote due to target visibility.',
			code: 'CANNOT_RENOTE_DUE_TO_VISIBILITY',
			id: 'be9529e9-fe72-4de0-ae43-0b363c4938af',
		},

		noSuchReplyTarget: {
			message: 'No such reply target.',
			code: 'NO_SUCH_REPLY_TARGET',
			id: '749ee0f6-d3da-459a-bf02-282e2da4292c',
		},

		cannotReplyToInvisibleNote: {
			message: 'You cannot reply to an invisible Note.',
			code: 'CANNOT_REPLY_TO_AN_INVISIBLE_NOTE',
			id: 'b98980fa-3780-406c-a935-b6d0eeee10d1',
		},

		cannotReplyToPureRenote: {
			message: 'You can not reply to a pure Renote.',
			code: 'CANNOT_REPLY_TO_A_PURE_RENOTE',
			id: '3ac74a84-8fd5-4bb0-870f-01804f82ce15',
		},

		cannotCreateAlreadyExpiredPoll: {
			message: 'Poll is already expired.',
			code: 'CANNOT_CREATE_ALREADY_EXPIRED_POLL',
			id: '04da457d-b083-4055-9082-955525eda5a5',
		},

		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: 'b1653923-5453-4edc-b786-7c4f39bb0bbb',
		},

		youHaveBeenBlocked: {
			message: 'You have been blocked by this user.',
			code: 'YOU_HAVE_BEEN_BLOCKED',
			id: 'b390d7e1-8a5e-46ed-b625-06271cafd3d3',
		},

		noSuchFile: {
			message: 'Some files are not found.',
			code: 'NO_SUCH_FILE',
			id: 'b6992544-63e7-67f0-fa7f-32444b1b5306',
		},

		cannotRenoteOutsideOfChannel: {
			message: 'Cannot renote outside of channel.',
			code: 'CANNOT_RENOTE_OUTSIDE_OF_CHANNEL',
			id: '33510210-8452-094c-6227-4a6c05d99f00',
		},

		containsProhibitedWords: {
			message: 'Cannot post because it contains prohibited words.',
			code: 'CONTAINS_PROHIBITED_WORDS',
			id: 'aa6e01d3-a85c-669d-758a-76aab43af334',
		},
	},
} as const;

export const paramDef = z.object({
	visibility: NoteVisibilitySchema.default('public'),
	visibleUserIds: IdSchema.array().refine(v => new Set(v).size === v.length).default([]),
	cw: z.string().min(1).max(100).nullable().default(null),
	localOnly: z.boolean().default(false),
	reactionAcceptance: NoteReactionAcceptanceSchema.default(null),
	noExtractMentions: z.boolean().default(false),
	noExtractHashtags: z.boolean().default(false),
	noExtractEmojis: z.boolean().default(false),
	replyId: IdSchema.nullable().default(null),
	renoteId: IdSchema.nullable().default(null),
	channelId: IdSchema.nullable().default(null),
	text: z.string().min(1).max(MAX_NOTE_TEXT_LENGTH).nullable().default(null),
	fileIds: IdSchema.array().min(1).max(16).refine(v => new Set(v).size === v.length).optional(),
	mediaIds: IdSchema.array().min(1).max(16).refine(v => new Set(v).size === v.length).optional(),
	poll: z.object({
		choices: z.string().min(1).max(50).array().min(2).max(10),
		multiple: z.boolean().default(false),
		expiresAt: z.number().int().nullable().default(null),
		expiredAfter: z.number().int().min(1).nullable().default(null),
	}).nullable().default(null),
}).refine((v) => {
	if (v.renoteId === null && v.fileIds == null && v.mediaIds == null && v.poll === null) {
		if (v.text === null || /^\s+$/.test(v.text)) {
			return false;
		} else {
			return true;
		}
	} else {
		return true;
	}
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		@Inject(DI.blockingsRepository)
		private readonly blockingsRepository: BlockingsRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		@Inject(DI.channelsRepository)
		private readonly channelsRepository: ChannelsRepository,

		private readonly noteEntityService: NoteEntityService,
		private readonly noteCreateService: NoteCreateService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const visibleUsers = ps.visibleUserIds.length !== 0
				? await this.usersRepository.findBy({ id: In(ps.visibleUserIds) })
				: [];

			let files: MiDriveFile[] = [];
			const fileIds = ps.fileIds ?? ps.mediaIds ?? null;
			if (fileIds !== null) {
				files = await this.driveFilesRepository.createQueryBuilder('file')
					.where('file.userId = :userId AND file.id IN (:...fileIds)', {
						userId: me.id,
						fileIds,
					})
					.orderBy('array_position(ARRAY[:...fileIds], "id"::text)')
					.setParameters({ fileIds })
					.getMany();

				if (files.length !== fileIds.length) {
					throw new ApiError(meta.errors.noSuchFile);
				}
			}

			let renote: MiNote | null = null;
			if (ps.renoteId !== null) {
				// Fetch renote to note
				renote = await this.notesRepository.findOneBy({ id: ps.renoteId });

				if (renote === null) {
					throw new ApiError(meta.errors.noSuchRenoteTarget);
				} else if (isPureRenote(renote)) {
					throw new ApiError(meta.errors.cannotReRenote);
				}

				// Check blocking
				if (renote.userId !== me.id) {
					const blockExist = await this.blockingsRepository.exists({
						where: {
							blockerId: renote.userId,
							blockeeId: me.id,
						},
					});
					if (blockExist) {
						throw new ApiError(meta.errors.youHaveBeenBlocked);
					}
				}

				if (renote.visibility === 'followers' && renote.userId !== me.id) {
					// 他人のfollowers noteはreject
					throw new ApiError(meta.errors.cannotRenoteDueToVisibility);
				} else if (renote.visibility === 'specified') {
					// specified / direct noteはreject
					throw new ApiError(meta.errors.cannotRenoteDueToVisibility);
				}

				if (renote.channelId !== null && renote.channelId !== ps.channelId) {
					// チャンネルのノートに対しリノート要求がきたとき、チャンネル外へのリノート可否をチェック
					// リノートのユースケースのうち、チャンネル内→チャンネル外は少数だと考えられるため、JOINはせず必要な時に都度取得する
					const renoteChannel = await this.channelsRepository.findOneBy({ id: renote.channelId });
					if (renoteChannel == null) {
						// リノートしたいノートが書き込まれているチャンネルが無い
						throw new ApiError(meta.errors.noSuchChannel);
					} else if (!renoteChannel.allowRenoteToExternal) {
						// リノート作成のリクエストだが、対象チャンネルがリノート禁止だった場合
						throw new ApiError(meta.errors.cannotRenoteOutsideOfChannel);
					}
				}
			}

			let reply: MiNote | null = null;
			if (ps.replyId !== null) {
				// Fetch reply
				reply = await this.notesRepository.findOneBy({ id: ps.replyId });

				if (reply == null) {
					throw new ApiError(meta.errors.noSuchReplyTarget);
				} else if (isPureRenote(reply)) {
					throw new ApiError(meta.errors.cannotReplyToPureRenote);
				} else if (!await this.noteEntityService.isVisibleForMe(reply, me.id)) {
					throw new ApiError(meta.errors.cannotReplyToInvisibleNote);
				}

				// Check blocking
				if (reply.userId !== me.id) {
					const blockExist = await this.blockingsRepository.exists({
						where: {
							blockerId: reply.userId,
							blockeeId: me.id,
						},
					});
					if (blockExist) {
						throw new ApiError(meta.errors.youHaveBeenBlocked);
					}
				}
			}

			let expiresAt: number | null = null;
			if (ps.poll !== null) {
				if (ps.poll.expiresAt !== null) {
					if (ps.poll.expiresAt < Date.now()) {
						throw new ApiError(meta.errors.cannotCreateAlreadyExpiredPoll);
					} else {
						expiresAt = ps.poll.expiresAt;
					}
				} else if (ps.poll.expiredAfter !== null) {
					expiresAt = Date.now() + ps.poll.expiredAfter;
				}
			}

			let channel: MiChannel | null = null;
			if (ps.channelId != null) {
				channel = await this.channelsRepository.findOneBy({ id: ps.channelId, isArchived: false });

				if (channel == null) {
					throw new ApiError(meta.errors.noSuchChannel);
				}
			}

			// 投稿を作成
			try {
				const note = await this.noteCreateService.create(me, {
					createdAt: new Date(),
					files: files,
					poll: ps.poll
						? {
								choices: ps.poll.choices,
								multiple: ps.poll.multiple,
								expiresAt: expiresAt !== null ? new Date(expiresAt) : null,
							}
						: null,
					text: ps.text,
					reply,
					renote,
					cw: ps.cw,
					localOnly: ps.localOnly,
					reactionAcceptance: ps.reactionAcceptance,
					visibility: ps.visibility,
					visibleUsers,
					channel,
					apMentions: ps.noExtractMentions ? [] : null,
					apHashtags: ps.noExtractHashtags ? [] : null,
					apEmojis: ps.noExtractEmojis ? [] : null,
				});

				return {
					createdNote: await this.noteEntityService.pack(note, me),
				};
			} catch (e) {
				// TODO: 他のErrorもここでキャッチしてエラーメッセージを当てるようにしたい
				if (e instanceof NoteCreateService.ContainsProhibitedWordsError) {
					throw new ApiError(meta.errors.containsProhibitedWords);
				}

				throw e;
			}
		});
	}
}
