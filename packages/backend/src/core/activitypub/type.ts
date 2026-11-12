/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import z from 'zod';

//#region Constants

export const VALID_ACTOR = [
	'Person',
	'Service',
	'Group',
	'Organization',
	'Application',
];

export const VALID_LIKE = [
	'EmojiReact',
	'EmojiReaction',
	'Like',
];

export const VALID_POST = [
	'Note',
	'Question',
	'Article',
	'Audio',
	'Document',
	'Image',
	'Page',
	'Video',
	'Event',
];

export const VALID_QUESTION = [
	'Note',
	'Question',
];

//#endregion

//#region Types

export type Obj = { [x: string]: unknown };

export type ApObject = IObject | string | (IObject | string)[];

export interface IObject {
	'@context'?: string | string[] | Obj | Obj[];
	'type': string | string[];
	'id'?: string;
	'name'?: string | null;
	'summary'?: string;
	'_misskey_summary'?: string;
	'published'?: string;
	'cc'?: ApObject;
	'to'?: ApObject;
	'attributedTo'?: ApObject;
	'attachment'?: unknown[];
	'inReplyTo'?: unknown;
	'replies'?: ICollection;
	'content'?: string | null;
	'startTime'?: Date;
	'endTime'?: Date;
	'icon'?: unknown;
	'image'?: unknown;
	'url'?: ApObject | string;
	'href'?: string;
	'tag'?: IObject | IObject[];
	'sensitive'?: boolean;
}

export interface IActivity extends IObject {
	// type: 'Activity';
	actor: IObject | string;
	object: IObject | string;
	target?: IObject | string;
	/** LD-Signature */
	signature?: {
		type: string;
		created: Date;
		creator: string;
		domain?: string;
		nonce?: string;
		signatureValue: string;
	};
}

export interface ICollection extends IObject {
	type: 'Collection';
	totalItems: number;
	items: ApObject;
}

export interface IOrderedCollection extends IObject {
	type: 'OrderedCollection';
	totalItems: number;
	orderedItems: ApObject;
}

export interface IPost extends IObject {
	type: 'Note' | 'Question' | 'Article' | 'Audio' | 'Document' | 'Image' | 'Page' | 'Video' | 'Event';
	source?: {
		content: string;
		mediaType: string;
	};
	_misskey_quote?: string;
	_misskey_content?: string;
	quoteUrl?: string;
}

export interface IQuestion extends IObject {
	type: 'Note' | 'Question';
	actor: string;
	source?: {
		content: string;
		mediaType: string;
	};
	_misskey_quote?: string;
	quoteUrl?: string;
	oneOf?: IQuestionChoice[];
	anyOf?: IQuestionChoice[];
	endTime?: Date;
	closed?: Date;
}

interface IQuestionChoice {
	name?: string;
	replies?: ICollection;
	_misskey_votes?: number;
}

export interface ITombstone extends IObject {
	type: 'Tombstone';
	formerType?: string;
	deleted?: Date;
}

export interface IActor extends IObject {
	'type': 'Person' | 'Service' | 'Organization' | 'Group' | 'Application';
	'name'?: string;
	'preferredUsername'?: string;
	'manuallyApprovesFollowers'?: boolean;
	'movedTo'?: string;
	'alsoKnownAs'?: string[];
	'discoverable'?: boolean;
	'inbox': string;
	'sharedInbox'?: string;	// 後方互換性のため
	'publicKey'?: {
		id: string;
		publicKeyPem: string;
	};
	'followers'?: string | ICollection | IOrderedCollection;
	'following'?: string | ICollection | IOrderedCollection;
	'featured'?: string | IOrderedCollection;
	'outbox': string | IOrderedCollection;
	'endpoints'?: {
		sharedInbox?: string;
	};
	'vcard:bday'?: string;
	'vcard:Address'?: string;
}

export interface IApPropertyValue extends IObject {
	type: 'PropertyValue';
	identifier: IApPropertyValue; // ?
	name: string;
	value: string;
}

export interface IApMention extends IObject {
	type: 'Mention';
	href: string;
	name: string;
}

export interface IApHashtag extends IObject {
	type: 'Hashtag';
	name: string;
}

export interface IApEmoji extends IObject {
	type: 'Emoji';
	name: string;
	updated: string;
}

export interface IKey extends IObject {
	type: 'Key';
	owner: string;
	publicKeyPem: string | Buffer;
}

export interface IApDocument extends IObject {
	type: 'Document';
	name: string | null;
	mediaType: string;
}

export interface IApImage extends IObject {
	type: 'Image';
	name: string | null;
}

export interface ICreate extends IActivity {
	type: 'Create';
}

export interface IDelete extends IActivity {
	type: 'Delete';
}

export interface IUpdate extends IActivity {
	type: 'Update';
}

export interface IRead extends IActivity {
	type: 'Read';
}

export interface IUndo extends IActivity {
	type: 'Undo';
}

export interface IFollow extends IActivity {
	type: 'Follow';
}

export interface IAccept extends IActivity {
	type: 'Accept';
}

export interface IReject extends IActivity {
	type: 'Reject';
}

export interface IAdd extends IActivity {
	type: 'Add';
}

export interface IRemove extends IActivity {
	type: 'Remove';
}

export interface ILike extends IActivity {
	type: 'Like' | 'EmojiReaction' | 'EmojiReact';
	_misskey_reaction?: string;
}

export interface IAnnounce extends IActivity {
	type: 'Announce';
}

export interface IBlock extends IActivity {
	type: 'Block';
}

export interface IFlag extends IActivity {
	type: 'Flag';
}

export interface IMove extends IActivity {
	type: 'Move';
	target: IObject | string;
}

//#endregion

//#region Functions

/**
 * Get ActivityStreams Object id
 */
export const getApId = (value: string | IObject): string => {
	if (typeof value === 'string') return value;
	if (typeof value.id === 'string') return value.id;
	throw new Error('cannot detemine id');
};

/**
 * Get array of ActivityStreams Objects id
 */
export const getApIds = (value: ApObject | null | undefined): string[] => {
	if (value == null) return [];
	const array = Array.isArray(value) ? value : [value];
	return array.map(x => getApId(x));
};

/**
 * Get first ActivityStreams Object id
 */
export const getOneApId = (value: ApObject): string => {
	const firstOne = Array.isArray(value) ? value[0] : value;
	return getApId(firstOne);
};

/**
 * Get ActivityStreams Object type
 */
export const getApType = (value: IObject): string => {
	if (typeof value.type === 'string') return value.type;
	if (Array.isArray(value.type) && typeof value.type[0] === 'string') return value.type[0];
	throw new Error('cannot detect type');
};

export const getApHrefNullable = (value: string | IObject | null | undefined): string | undefined => {
	if (typeof value === 'string') return value;
	if (typeof value?.href === 'string') return value.href;
	return undefined;
};

export const getOneApHrefNullable = (value: ApObject | null | undefined): string | undefined => {
	const firstOne = Array.isArray(value) ? value[0] : value;
	return getApHrefNullable(firstOne);
};

export const isAccept            = (object: IObject): object is IAccept            => getApType(object) === 'Accept'           ;
export const isAdd               = (object: IObject): object is IAdd               => getApType(object) === 'Add'              ;
export const isAnnounce          = (object: IObject): object is IAnnounce          => getApType(object) === 'Announce'         ;
export const isBlock             = (object: IObject): object is IBlock             => getApType(object) === 'Block'            ;
export const isCollection        = (object: IObject): object is ICollection        => getApType(object) === 'Collection'       ;
export const isCreate            = (object: IObject): object is ICreate            => getApType(object) === 'Create'           ;
export const isDelete            = (object: IObject): object is IDelete            => getApType(object) === 'Delete'           ;
export const isFlag              = (object: IObject): object is IFlag              => getApType(object) === 'Flag'             ;
export const isFollow            = (object: IObject): object is IFollow            => getApType(object) === 'Follow'           ;
export const isMove              = (object: IObject): object is IMove              => getApType(object) === 'Move'             ;
export const isOrderedCollection = (object: IObject): object is IOrderedCollection => getApType(object) === 'OrderedCollection';
export const isRead              = (object: IObject): object is IRead              => getApType(object) === 'Read'             ;
export const isReject            = (object: IObject): object is IReject            => getApType(object) === 'Reject'           ;
export const isRemove            = (object: IObject): object is IRemove            => getApType(object) === 'Remove'           ;
export const isTombstone         = (object: IObject): object is ITombstone         => getApType(object) === 'Tombstone'        ;
export const isUndo              = (object: IObject): object is IUndo              => getApType(object) === 'Undo'             ;
export const isUpdate            = (object: IObject): object is IUpdate            => getApType(object) === 'Update'           ;

export const isActor    = (object: IObject): object is IActor    => VALID_ACTOR   .includes(getApType(object));
export const isLike     = (object: IObject): object is ILike     => VALID_LIKE    .includes(getApType(object));
export const isPost     = (object: IObject): object is IPost     => VALID_POST    .includes(getApType(object));
export const isQuestion = (object: IObject): object is IQuestion => VALID_QUESTION.includes(getApType(object));

export const isCollectionOrOrderedCollection = (object: IObject): object is ICollection | IOrderedCollection => {
	return isCollection(object) || isOrderedCollection(object);
};

export const isPropertyValue = (object: IObject): object is IApPropertyValue => {
	if (getApType(object) !== 'PropertyValue') return false;

	const result = z.object({
		name: z.string(),
		value: z.string(),
	}).safeParse(object);

	return result.success;
};

export const isMention = (object: IObject): object is IApMention => {
	if (getApType(object) !== 'Mention') return false;

	const result = z.object({
		href: z.string(),
	}).safeParse(object);

	return result.success;
};

export const isHashtag = (object: IObject): object is IApHashtag => {
	if (getApType(object) !== 'Hashtag') return false;

	const result = z.object({
		name: z.string(),
	}).safeParse(object);

	return result.success;
};

export const isEmoji = (object: IObject): object is IApEmoji => {
	if (getApType(object) !== 'Emoji') return false;

	const result = z.object({
		icon: z.object({
			url: z.custom<NonNullable<unknown>>((value) => value != null),
		}),
	}).safeParse(object);

	return result.success;
};

//#endregion
