/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

declare module 'http-signature' {
	import type { IncomingMessage } from 'node:http';

	interface ISignature {
		keyId: string;
		algorithm: string;
		headers: string[];
		signature: string;
	}

	interface IOptions {
		headers?: string[];
		algorithm?: string;
		strict?: boolean;
		authorizationHeaderName?: string;
	}

	interface IParseRequestOptions extends IOptions {
		clockSkew?: number;
	}

	interface IParsedSignature {
		scheme: string;
		params: ISignature;
		signingString: string;
		algorithm: string;
		keyId: string;
	}

	export function parseRequest(request: IncomingMessage, options?: IParseRequestOptions): IParsedSignature;
	export function verifySignature(parsedSignature: IParsedSignature, pubkey: string | Buffer): boolean;
}
