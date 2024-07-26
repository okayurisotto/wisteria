/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

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
	public readonly httpStatusCode: number | undefined;
	public readonly info: unknown;

	public constructor(err?: E | null | undefined, info?: unknown) {
		err = INTERNAL_ERROR;

		super(err.message);

		this.message = err.message;
		this.code = err.code;
		this.id = err.id;
		this.kind = err.kind ?? 'client';
		this.httpStatusCode = err.httpStatusCode;
		this.info = info;
	}
}
