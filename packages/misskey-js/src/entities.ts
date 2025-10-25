import type { ModerationLogPayloads } from './consts.js';
import type { components } from './autogen.js';

export type Error = components['schemas']['Error'];
export type Announcement = components['schemas']['Announcement'];
export type Antenna = components['schemas']['Antenna'];
export type App = components['schemas']['App'];
export type Birthday = components['schemas']['Birthday'];
export type Blocking = components['schemas']['Blocking'];
export type Channel = components['schemas']['Channel'];
export type Clip = components['schemas']['Clip'];
export type Description = components['schemas']['Description'];
export type DriveFile = components['schemas']['DriveFile'];
export type DriveFolder = components['schemas']['DriveFolder'];
export type EmojiDetailed = components['schemas']['EmojiDetailed'];
export type EmojiSimple = components['schemas']['EmojiSimple'];
export type FederationInstance = components['schemas']['FederationInstance'];
export type Following = components['schemas']['Following'];
export type Hashtag = components['schemas']['Hashtag'];
export type Id = components['schemas']['Id'];
export type InviteCode = components['schemas']['InviteCode'];
export type LocalUsername = components['schemas']['LocalUsername'];
export type Location = components['schemas']['Location'];
export type MeDetailed = components['schemas']['MeDetailed'];
export type Muting = components['schemas']['Muting'];
export type Name = components['schemas']['Name'];
export type Note = components['schemas']['Note'];
export type NoteFavorite = components['schemas']['NoteFavorite'];
export type NoteReaction = components['schemas']['NoteReaction'];
export type Notification = components['schemas']['Notification'];
export type NotificationRecieveConfig = components['schemas']['NotificationRecieveConfig'];
export type Page = components['schemas']['Page'];
export type Password = components['schemas']['Password'];
export type QueueCount = components['schemas']['QueueCount'];
export type RenoteMuting = components['schemas']['RenoteMuting'];
export type Role = components['schemas']['Role'];
export type RolePolicies = components['schemas']['RolePolicies'];
export type Signin = components['schemas']['Signin'];
export type User = components['schemas']['User'];
export type UserDetailed = components['schemas']['UserDetailed'];
export type UserDetailedNotMe = components['schemas']['UserDetailedNotMe'];
export type UserList = components['schemas']['UserList'];
export type UserLite = components['schemas']['UserLite'];
export type FollowingFolloweePopulated = components['schemas']['UserLite'];

export type ID = string;
export type DateString = string;

export type PageEvent = {
	pageId: Page['id'];
	event: string;
	var: unknown;
	userId: User['id'];
	user: User;
};

export type ModerationLog = {
	id: ID;
	createdAt: DateString;
	userId: User['id'];
	user: UserDetailedNotMe | null;
} & ({
	type: 'updateServerSettings';
	info: ModerationLogPayloads['updateServerSettings'];
} | {
	type: 'suspend';
	info: ModerationLogPayloads['suspend'];
} | {
	type: 'unsuspend';
	info: ModerationLogPayloads['unsuspend'];
} | {
	type: 'updateUserNote';
	info: ModerationLogPayloads['updateUserNote'];
} | {
	type: 'addCustomEmoji';
	info: ModerationLogPayloads['addCustomEmoji'];
} | {
	type: 'updateCustomEmoji';
	info: ModerationLogPayloads['updateCustomEmoji'];
} | {
	type: 'deleteCustomEmoji';
	info: ModerationLogPayloads['deleteCustomEmoji'];
} | {
	type: 'assignRole';
	info: ModerationLogPayloads['assignRole'];
} | {
	type: 'unassignRole';
	info: ModerationLogPayloads['unassignRole'];
} | {
	type: 'createRole';
	info: ModerationLogPayloads['createRole'];
} | {
	type: 'updateRole';
	info: ModerationLogPayloads['updateRole'];
} | {
	type: 'deleteRole';
	info: ModerationLogPayloads['deleteRole'];
} | {
	type: 'clearQueue';
	info: ModerationLogPayloads['clearQueue'];
} | {
	type: 'promoteQueue';
	info: ModerationLogPayloads['promoteQueue'];
} | {
	type: 'deleteDriveFile';
	info: ModerationLogPayloads['deleteDriveFile'];
} | {
	type: 'deleteNote';
	info: ModerationLogPayloads['deleteNote'];
} | {
	type: 'createGlobalAnnouncement';
	info: ModerationLogPayloads['createGlobalAnnouncement'];
} | {
	type: 'createUserAnnouncement';
	info: ModerationLogPayloads['createUserAnnouncement'];
} | {
	type: 'updateGlobalAnnouncement';
	info: ModerationLogPayloads['updateGlobalAnnouncement'];
} | {
	type: 'updateUserAnnouncement';
	info: ModerationLogPayloads['updateUserAnnouncement'];
} | {
	type: 'deleteGlobalAnnouncement';
	info: ModerationLogPayloads['deleteGlobalAnnouncement'];
} | {
	type: 'deleteUserAnnouncement';
	info: ModerationLogPayloads['deleteUserAnnouncement'];
} | {
	type: 'resetPassword';
	info: ModerationLogPayloads['resetPassword'];
} | {
	type: 'suspendRemoteInstance';
	info: ModerationLogPayloads['suspendRemoteInstance'];
} | {
	type: 'unsuspendRemoteInstance';
	info: ModerationLogPayloads['unsuspendRemoteInstance'];
} | {
	type: 'markSensitiveDriveFile';
	info: ModerationLogPayloads['markSensitiveDriveFile'];
} | {
	type: 'unmarkSensitiveDriveFile';
	info: ModerationLogPayloads['unmarkSensitiveDriveFile'];
} | {
	type: 'createInvitation';
	info: ModerationLogPayloads['createInvitation'];
} | {
	type: 'createAd';
	info: ModerationLogPayloads['createAd'];
} | {
	type: 'updateAd';
	info: ModerationLogPayloads['updateAd'];
} | {
	type: 'deleteAd';
	info: ModerationLogPayloads['deleteAd'];
} | {
	type: 'createAvatarDecoration';
	info: ModerationLogPayloads['createAvatarDecoration'];
} | {
	type: 'updateAvatarDecoration';
	info: ModerationLogPayloads['updateAvatarDecoration'];
} | {
	type: 'deleteAvatarDecoration';
	info: ModerationLogPayloads['deleteAvatarDecoration'];
} | {
	type: 'resolveAbuseReport';
	info: ModerationLogPayloads['resolveAbuseReport'];
} | {
	type: 'unsetUserAvatar';
	info: ModerationLogPayloads['unsetUserAvatar'];
} | {
	type: 'unsetUserBanner';
	info: ModerationLogPayloads['unsetUserBanner'];
});

export type ServerStats = {
	cpu: number;
	mem: {
		used: number;
		active: number;
	};
	net: {
		rx: number;
		tx: number;
	};
	fs: {
		r: number;
		w: number;
	};
};

export type ServerStatsLog = ServerStats[];

export type QueueStats = {
	deliver: {
		activeSincePrevTick: number;
		active: number;
		waiting: number;
		delayed: number;
	};
	inbox: {
		activeSincePrevTick: number;
		active: number;
		waiting: number;
		delayed: number;
	};
};

export type QueueStatsLog = QueueStats[];

export type EmojiAdded = {
	emoji: EmojiDetailed;
};

export type EmojiUpdated = {
	emojis: EmojiDetailed[];
};

export type EmojiDeleted = {
	emojis: EmojiDetailed[];
};

export type AnnouncementCreated = {
	announcement: Announcement;
};

export type SignupRequest = {
	'username': string;
	'password': string;
	'host'?: string;
	'invitationCode'?: string;
	'emailAddress'?: string;
	'hcaptcha-response'?: string | null;
	'g-recaptcha-response'?: string | null;
	'turnstile-response'?: string | null;
};

export type SignupResponse = MeDetailed & {
	token: string;
};

export type SignupPendingRequest = {
	code: string;
};

export type SignupPendingResponse = {
	id: User['id'];
	i: string;
};

export type SigninRequest = {
	username: string;
	password: string;
	token?: string;
};

export type SigninResponse = {
	id: User['id'];
	i: string;
};
