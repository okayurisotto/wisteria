import type { IncomingMessage } from 'node:http';
import sshpk from 'sshpk';
import type { Result } from './common/types.js';
import { Signature } from './common/Signature.js';

export type { Signature } from './common/Signature.js';

const isValidHeader = <T>(entry: [string, T]): entry is [string, T & string] => {
	return typeof entry[1] === 'string';
};

/**
 * `IncomingMessage`から`Signature`と署名検証用の文字列を得る
 */
export const parseRequest = (request: IncomingMessage): Result<{ signature: Signature; signingString: string }, never> => {
	// `request`がサーバへのものであることを確認
	const method = request.method;
	if (method === undefined) return { ok: false };
	const url = request.url;
	if (url === undefined) return { ok: false };

	// `Authorization`もしくは`Signature`ヘッダーを取得
	const authorizationHeaderValue = (() => {
		const authorizationHeaderValue = request.headers['authorization'];
		if (authorizationHeaderValue) {
			return {
				type: 'authorization',
				value: authorizationHeaderValue,
			} as const;
		}

		return {
			type: 'signature',
			value: request.headers['signature'],
		} as const;
	})();
	if (authorizationHeaderValue.value === undefined) return { ok: false };
	if (Array.isArray(authorizationHeaderValue.value)) return { ok: false };

	// `Signature`インスタンスを取得
	const signature = Signature.from(authorizationHeaderValue.value, authorizationHeaderValue.type);
	if (!signature.ok) return { ok: false };

	// 署名の検証のために署名文字列を復元
	const requestHeaders = new Map(Object.entries(request.headers).filter(isValidHeader));
	const signingString = signature.value.recreate(method, url, requestHeaders);
	if (!signingString.ok) return { ok: false };

	return {
		ok: true,
		value: {
			signature: signature.value,
			signingString: signingString.value,
		},
	};
};

/**
 * 署名を検証する
 */
export const verifySignature = (signingString: string, publicKey: string, signature: string) => {
	const key = sshpk.parseKey(publicKey);
	return key.createVerify('sha256').update(signingString).verify(signature, 'base64');
};
