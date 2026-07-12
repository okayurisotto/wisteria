/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { MiUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import type { MiAntenna } from '@/models/Antenna.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import type { MiDriveFolder } from '@/models/DriveFolder.js';
import type { MiUserList } from '@/models/UserList.js';
import type { MiAbuseUserReport } from '@/models/AbuseUserReport.js';
import type { MiSignin } from '@/models/Signin.js';
import type { MiPage } from '@/models/Page.js';
import type { MiWebhook } from '@/models/Webhook.js';
import { MiRole } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { Serialized } from '@/types.js';
import type { EventEmitter } from 'events';
import type { UnionToIntersection, ValueOf } from 'type-fest';
import type { z } from 'zod';
import type { AnnouncementSchema } from '@/models/zod/announcement';
import type { DriveFileSchema } from '@/models/zod/drive-file';
import type { DriveFolderSchema } from '@/models/zod/drive-folder';
import type { EmojiDetailedSchema } from '@/models/zod/emoji';
import type { NoteSchema } from '@/models/zod/note';
import type { NotificationSchema } from '@/models/zod/notification';
import type { UserDetailedNotMeSchema, UserDetailedSchema } from '@/models/zod/user';
import type { UserLiteSchema } from '@/models/zod/user-lite';

// #region Stream type-body definitions
export interface BroadcastTypes {
	emojiAdded: {
		emoji: z.infer<typeof EmojiDetailedSchema>;
	};
	emojiUpdated: {
		emojis: z.infer<typeof EmojiDetailedSchema>[];
	};
	emojiDeleted: {
		emojis: {
			id?: string;
			name: string;
			[other: string]: any;
		}[];
	};
}

export interface MainEventTypes {
	notification: z.infer<typeof NotificationSchema>;
	mention: z.infer<typeof NoteSchema>;
	reply: z.infer<typeof NoteSchema>;
	renote: z.infer<typeof NoteSchema>;
	follow: z.infer<typeof UserDetailedNotMeSchema>;
	followed: z.infer<typeof UserLiteSchema>;
	unfollow: z.infer<typeof UserDetailedNotMeSchema>;
	meUpdated: null;
	pageEvent: {
		pageId: MiPage['id'];
		event: string;
		var: any;
		userId: MiUser['id'];
		user: z.infer<typeof UserDetailedSchema>;
	};
	urlUploadFinished: {
		marker?: string | null;
		file: z.infer<typeof DriveFileSchema>;
	};
	readAllNotifications: undefined;
	unreadNotification: z.infer<typeof NotificationSchema>;
	unreadMention: MiNote['id'];
	readAllUnreadMentions: undefined;
	unreadSpecifiedNote: MiNote['id'];
	readAllUnreadSpecifiedNotes: undefined;
	readAllAntennas: undefined;
	unreadAntenna: MiAntenna;
	readAllAnnouncements: undefined;
	myTokenRegenerated: undefined;
	signin: {
		id: MiSignin['id'];
		createdAt: string;
		ip: string;
		headers: Record<string, any>;
		success: boolean;
	};
	registryUpdated: {
		scope?: string[];
		key: string;
		value: any | null;
	};
	driveFileCreated: z.infer<typeof DriveFileSchema>;
	readAntenna: MiAntenna;
	receiveFollowRequest: z.infer<typeof UserLiteSchema>;
}

export interface DriveEventTypes {
	fileCreated: z.infer<typeof DriveFileSchema>;
	fileDeleted: MiDriveFile['id'];
	fileUpdated: z.infer<typeof DriveFileSchema>;
	folderCreated: z.infer<typeof DriveFolderSchema>;
	folderDeleted: MiDriveFolder['id'];
	folderUpdated: z.infer<typeof DriveFolderSchema>;
}

export interface NoteEventTypes {
	pollVoted: {
		choice: number;
		userId: MiUser['id'];
	};
	deleted: {
		deletedAt: Date;
	};
	updated: {
		cw: string | null;
		text: string;
	};
	reacted: {
		reaction: string;
		emoji?: {
			name: string;
			url: string;
		} | null;
		userId: MiUser['id'];
	};
	unreacted: {
		reaction: string;
		userId: MiUser['id'];
	};
}
type NoteStreamEventTypes = {
	[key in keyof NoteEventTypes]: {
		id: MiNote['id'];
		body: NoteEventTypes[key];
	};
};

export interface UserListEventTypes {
	userAdded: z.infer<typeof UserLiteSchema>;
	userRemoved: z.infer<typeof UserLiteSchema>;
}

export interface AntennaEventTypes {
	note: MiNote;
}

export interface RoleTimelineEventTypes {
	note: z.infer<typeof NoteSchema>;
}

export interface AdminEventTypes {
	newAbuseUserReport: {
		id: MiAbuseUserReport['id'];
		targetUserId: MiUser['id'];
		reporterId: MiUser['id'];
		comment: string;
	};
}

// #endregion

// 辞書(interface or type)から{ type, body }ユニオンを定義
// https://stackoverflow.com/questions/49311989/can-i-infer-the-type-of-a-value-using-extends-keyof-type
// VS Codeの展開を防止するためにEvents型を定義
type Events<T extends object> = { [K in keyof T]: { type: K; body: T[K] } };
type EventUnionFromDictionary<
	T extends object,
	U = Events<T>,
> = ValueOf<U>;

type SerializedAll<T> = {
	[K in keyof T]: Serialized<T[K]>;
};

export interface InternalEventTypes {
	webhookCreated: MiWebhook;
	webhookDeleted: MiWebhook;
	webhookUpdated: MiWebhook;
	antennaCreated: MiAntenna;
	antennaDeleted: MiAntenna;
	antennaUpdated: MiAntenna;
}

// name/messages(spec) pairs dictionary
export type GlobalEvents = {
	internal: {
		name: 'internal';
		payload: EventUnionFromDictionary<SerializedAll<InternalEventTypes>>;
	};
	broadcast: {
		name: 'broadcast';
		payload: EventUnionFromDictionary<SerializedAll<BroadcastTypes>>;
	};
	main: {
		name: `mainStream:${MiUser['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<MainEventTypes>>;
	};
	drive: {
		name: `driveStream:${MiUser['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<DriveEventTypes>>;
	};
	note: {
		name: `noteStream:${MiNote['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<NoteStreamEventTypes>>;
	};
	userList: {
		name: `userListStream:${MiUserList['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<UserListEventTypes>>;
	};
	roleTimeline: {
		name: `roleTimelineStream:${MiRole['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<RoleTimelineEventTypes>>;
	};
	antenna: {
		name: `antennaStream:${MiAntenna['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<AntennaEventTypes>>;
	};
	admin: {
		name: `adminStream:${MiUser['id']}`;
		payload: EventUnionFromDictionary<SerializedAll<AdminEventTypes>>;
	};
	notes: {
		name: 'notesStream';
		payload: Serialized<z.infer<typeof NoteSchema>>;
	};
};

// API event definitions
// ストリームごとのEmitterの辞書を用意
type EventEmitterDictionary = { [x in keyof GlobalEvents]: Emitter.default<EventEmitter, { [y in GlobalEvents[x]['name']]: (e: GlobalEvents[x]['payload']) => void }> };
// Emitter辞書から共用体型を作り、UnionToIntersectionで交差型にする
export type StreamEventEmitter = UnionToIntersection<EventEmitterDictionary[keyof GlobalEvents]>;
// { [y in name]: (e: spec) => void }をまとめてその交差型をEmitterにかけるとts(2590)にひっかかる

// provide stream channels union
export type StreamChannels = GlobalEvents[keyof GlobalEvents]['name'];

@Injectable()
export class GlobalEventService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		@Inject(DI.redisForPub)
		private readonly redisForPub: Redis.Redis,
	) {}

	private publish(channel: StreamChannels, type: string | null, value?: any): void {
		const message = type == null
			? value
			: value == null
				? { type: type, body: null }
				: { type: type, body: value };

		this.redisForPub.publish(this.config.host, JSON.stringify({
			channel: channel,
			message: message,
		}));
	}

	public publishInternalEvent<K extends keyof InternalEventTypes>(type: K, value?: InternalEventTypes[K]): void {
		this.publish('internal', type, typeof value === 'undefined' ? null : value);
	}

	public publishBroadcastStream<K extends keyof BroadcastTypes>(type: K, value?: BroadcastTypes[K]): void {
		this.publish('broadcast', type, typeof value === 'undefined' ? null : value);
	}

	public publishMainStream<K extends keyof MainEventTypes>(userId: MiUser['id'], type: K, value?: MainEventTypes[K]): void {
		this.publish(`mainStream:${userId}`, type, typeof value === 'undefined' ? null : value);
	}

	public publishDriveStream<K extends keyof DriveEventTypes>(userId: MiUser['id'], type: K, value?: DriveEventTypes[K]): void {
		this.publish(`driveStream:${userId}`, type, typeof value === 'undefined' ? null : value);
	}

	public publishNoteStream<K extends keyof NoteEventTypes>(noteId: MiNote['id'], type: K, value?: NoteEventTypes[K]): void {
		this.publish(`noteStream:${noteId}`, type, {
			id: noteId,
			body: value,
		});
	}

	public publishUserListStream<K extends keyof UserListEventTypes>(listId: MiUserList['id'], type: K, value?: UserListEventTypes[K]): void {
		this.publish(`userListStream:${listId}`, type, typeof value === 'undefined' ? null : value);
	}

	public publishAntennaStream<K extends keyof AntennaEventTypes>(antennaId: MiAntenna['id'], type: K, value?: AntennaEventTypes[K]): void {
		this.publish(`antennaStream:${antennaId}`, type, typeof value === 'undefined' ? null : value);
	}

	public publishRoleTimelineStream<K extends keyof RoleTimelineEventTypes>(roleId: MiRole['id'], type: K, value?: RoleTimelineEventTypes[K]): void {
		this.publish(`roleTimelineStream:${roleId}`, type, typeof value === 'undefined' ? null : value);
	}

	public publishNotesStream(note: z.infer<typeof NoteSchema>): void {
		this.publish('notesStream', null, note);
	}

	public publishAdminStream<K extends keyof AdminEventTypes>(userId: MiUser['id'], type: K, value?: AdminEventTypes[K]): void {
		this.publish(`adminStream:${userId}`, type, typeof value === 'undefined' ? null : value);
	}
}
