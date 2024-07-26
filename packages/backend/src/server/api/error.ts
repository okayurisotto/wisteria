/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Jsonifiable } from 'type-fest';
import { LiteResponse } from '@/misc/LiteResponse.js';

type E = {
	message: string;
	code: string;
	id: string;
	kind?: 'client' | 'server' | 'permission';
	httpStatusCode?: number;
};

const INTERNAL_ERROR = {
	message: 'Internal error occurred. Please contact us if the error persists.',
	code: 'INTERNAL_ERROR',
	id: '5d37dbcb-891e-41ca-a3d6-e690c97775ac',
	kind: 'server',
	httpStatusCode: 500,
} as const satisfies E;

export class ApiError extends Error {
	public override readonly message: string;
	public readonly code: string;
	public readonly id: string;
	public readonly kind: string;
	public readonly httpStatusCode: number;

	public constructor(
		err?: E | null | undefined,
		private readonly info?: unknown,
		private readonly headers = new Map<string, string>(),
	) {
		err = err ?? INTERNAL_ERROR;

		super(err.message);

		this.message = err.message;
		this.code = err.code;
		this.id = err.id;
		this.kind = err.kind ?? 'client';
		this.httpStatusCode =
			err.httpStatusCode ??
			(this.kind === 'client' ? 400 : undefined) ??
			(this.kind === 'permission' ? 403 : undefined) ??
			500;
	}

	public serialize(): LiteResponse<NonNullable<Jsonifiable>> {
		const headers = new Map<string, string>(this.headers);

		if (!headers.has('WWW-Authenticate')) {
			if (this.httpStatusCode === 401) {
				headers.set('WWW-Authenticate', 'Bearer realm="Misskey"');
			} else if (this.kind === 'client') {
				headers.set(
					'WWW-Authenticate',
					`Bearer realm="Misskey", error="invalid_request", error_description="${this.message}"`,
				);
			} else if (this.kind === 'permission') {
				if (this.code === 'PERMISSION_DENIED') {
					headers.set(
						'WWW-Authenticate',
						`Bearer realm="Misskey", error="insufficient_scope", error_description="${this.message}"`,
					);
				}

				// `ROLE_PERMISSION_DENIED`は関係ない
			}
		}

		return LiteResponse.from(
			this.httpStatusCode,
			{
				error: {
					message: this.message,
					code: this.code,
					id: this.id,
					kind: this.kind,
					...(this.info ? { info: this.info } : {}),
				},
			},
			headers,
		);
	}
}
