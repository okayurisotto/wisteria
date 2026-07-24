/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import type { MiLocalUser } from '@/models/User.js';
import type { MiAccessToken } from '@/models/AccessToken.js';
import { ApiError } from './error.js';
import type { EndpointMeta } from './endpoints.js';
import type { z } from 'zod';

type File = {
	name: string | null;
	path: string;
};

type Executor<T extends EndpointMeta, Ps extends z.ZodType> =
	(
		params: z.output<Ps>,
		user: T['requireCredential'] extends true ? MiLocalUser : MiLocalUser | null,
		token: MiAccessToken | null,
		file?: File,
		cleanup?: () => unknown,
		ip?: string | null,
		headers?: Record<string, string> | null,
	) => Promise<
		T['res'] extends undefined
			? Record<string, unknown> | undefined
			: z.output<NonNullable<T['res']>>
	>;

export type ExecMethodType<T extends EndpointMeta = EndpointMeta> = (
	params: unknown,
	user: T['requireCredential'] extends true ? MiLocalUser : MiLocalUser | null,
	token: MiAccessToken | null,
	file?: File,
	ip?: string | null,
	headers?: Record<string, string> | null,
) => Promise<unknown>;

export abstract class AbstractEndpoint<T extends EndpointMeta, Ps extends z.ZodType> {
	public exec: ExecMethodType<T>;

	constructor(meta: T, paramDef: Ps, cb: Executor<T, Ps>) {
		this.exec = (
			params: unknown,
			user: T['requireCredential'] extends true ? MiLocalUser : MiLocalUser | null,
			token: MiAccessToken | null,
			file?: File,
			ip?: string | null,
			headers?: Record<string, string> | null,
		) => {
			let cleanup: undefined | (() => void);

			if (meta.requireFile === true) {
				cleanup = () => {
					if (file) {
						fs.unlink(file.path, () => {});
					}
				};

				if (file == null) {
					return Promise.reject(new ApiError({
						message: 'File required.',
						code: 'FILE_REQUIRED',
						id: '4267801e-70d1-416a-b011-4ee502885d8b',
					}));
				}
			}

			const valid: z.SafeParseReturnType<z.output<Ps>, z.input<Ps>> = paramDef.safeParse(params);
			if (!valid.success) {
				if (file) cleanup?.();

				const errors = valid.error.issues;
				const err = new ApiError({
					message: 'Invalid param.',
					code: 'INVALID_PARAM',
					id: '3d81ceae-475f-4600-b2a8-2bc116157532',
				}, errors);
				return Promise.reject(err);
			}

			return cb(valid.data, user, token, file, cleanup, ip, headers);
		};
	}
}
