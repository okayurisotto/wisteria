/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import ms from 'ms';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { MiNote } from '@/models/Note.js';
import type { MiLocalUser, MiUser } from '@/models/User.js';
import { isActor, isPost, getApId } from '@/core/activitypub/type.js';
import { ApResolverService } from '@/core/activitypub/ApResolverService.js';
import { ApDbResolverService } from '@/core/activitypub/ApDbResolverService.js';
import { MetaService } from '@/core/MetaService.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { ApiError } from '../../error.js';
import { z } from 'zod';
import { UserDetailedNotMeSchema } from '@/models/zod/user.js';
import { NoteSchema } from '@/models/zod/note.js';

export const meta = {
	tags: ['federation'],

	requireCredential: true,
	kind: 'read:account',

	limit: {
		duration: ms('1hour'),
		max: 30,
	},

	errors: {
		noSuchObject: {
			message: 'No such object.',
			code: 'NO_SUCH_OBJECT',
			id: 'dc94d745-1262-4e63-a17d-fecaa57efc82',
		},
	},

	res: z.union([
		z.object({
			type: z.enum(['User']).optional(),
			object: UserDetailedNotMeSchema.optional(),
		}),
		z.object({
			type: z.enum(['Note']).optional(),
			object: NoteSchema.optional(),
		}),
	]),
} as const;

export const paramDef = z.object({
	uri: z.string(),
});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		private readonly utilityService: UtilityService,
		private readonly userEntityService: UserEntityService,
		private readonly noteEntityService: NoteEntityService,
		private readonly metaService: MetaService,
		private readonly apResolverService: ApResolverService,
		private readonly apDbResolverService: ApDbResolverService,
		private readonly apPersonService: ApPersonService,
		private readonly apNoteService: ApNoteService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const object = await this.fetchAny(ps.uri, me);
			if (object) {
				return object;
			} else {
				throw new ApiError(meta.errors.noSuchObject);
			}
		});
	}

	/***
	 * URIからUserかNoteを解決する
	 */
	private async fetchAny(uri: string, me: MiLocalUser | null | undefined): Promise<z.infer<typeof meta['res']> | null> {
	// ブロックしてたら中断
		const fetchedMeta = await this.metaService.fetch();
		if (this.utilityService.isBlockedHost(fetchedMeta.blockedHosts, this.utilityService.extractDbHost(uri))) return null;

		let local = await this.mergePack(me, ...await Promise.all([
			this.apDbResolverService.getUserFromApId(uri),
			this.apDbResolverService.getNoteFromApId(uri),
		]));
		if (local != null) return local;

		// リモートから一旦オブジェクトフェッチ
		const resolver = this.apResolverService.createResolver();
		const object = await resolver.resolve(uri);

		// /@user のような正規id以外で取得できるURIが指定されていた場合、ここで初めて正規URIが確定する
		// これはDBに存在する可能性があるため再度DB検索
		if (uri !== object.id) {
			local = await this.mergePack(me, ...await Promise.all([
				this.apDbResolverService.getUserFromApId(object.id),
				this.apDbResolverService.getNoteFromApId(object.id),
			]));
			if (local != null) return local;
		}

		return await this.mergePack(
			me,
			isActor(object) ? await this.apPersonService.createPerson(getApId(object)) : null,
			isPost(object) ? await this.apNoteService.createNote(getApId(object), undefined, true) : null,
		);
	}

	private async mergePack(me: MiLocalUser | null | undefined, user: MiUser | null | undefined, note: MiNote | null | undefined): Promise<z.infer<typeof meta.res> | null> {
		if (user != null) {
			return {
				type: 'User',
				object: await this.userEntityService.pack(user, me, { schema: 'UserDetailedNotMe' }),
			};
		} else if (note != null) {
			try {
				const object = await this.noteEntityService.pack(note, me, { detail: true });

				return {
					type: 'Note',
					object,
				};
			} catch (e) {
				return null;
			}
		}

		return null;
	}
}
