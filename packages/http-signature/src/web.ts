import sshpk from 'sshpk';
import type { Result } from './common/types.js';
import { Signature } from './common/Signature.js';

export type { Signature } from './common/Signature.js';

/**
 * `Request`から`Signature`と署名検証用の文字列を得る
 */
export const parseRequest = (request: Request): Result<{ signature: Signature; signingString: string }, never> => {
	// `Authorization`もしくは`Signature`ヘッダーを取得
	const authorizationHeaderValue = (() => {
		const authorizationHeaderValue = request.headers.get('authorization');
		if (authorizationHeaderValue) {
			return {
				type: 'authorization',
				value: authorizationHeaderValue,
			} as const;
		}

		return {
			type: 'signature',
			value: request.headers.get('signature'),
		} as const;
	})();
	if (authorizationHeaderValue.value === null) return { ok: false };

	// `Signature`インスタンスを取得
	const signature = Signature.from(authorizationHeaderValue.value, authorizationHeaderValue.type);
	if (!signature.ok) return { ok: false };

	// 署名の検証のために署名文字列を復元
	const requestHeaders = new Map(request.headers.entries());
	const url = new URL(request.url);
	const signingString = signature.value.recreate(request.method, url.pathname + url.search, requestHeaders);
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
