import type { Result } from './types.js';
import { parseParametersAsAuthorizationHeaderValue, parseParametersAsSignatureHeaderValue } from './parseParameters.js';
import { parseHeaders } from './parseHeaders.js';
import { isUniqueArray } from './utils.js';

export class Signature {
	public static from(headerValue: string, headerType: 'authorization' | 'signature'): Result<Signature, never> {
		const parser = (() => {
			switch (headerType) {
				case 'authorization': return parseParametersAsAuthorizationHeaderValue;
				case 'signature': return parseParametersAsSignatureHeaderValue;
				default: return headerType satisfies never;
			}
		})();

		const parsedParameters = parser(headerValue);
		if (!parsedParameters.ok) return { ok: false };

		const parameters = new Map<string, string | number>(
			parsedParameters.value.map(({ key, value }) => [key, value]),
		);

		const keyId = parameters.get('keyId');
		if (typeof keyId !== 'string') return { ok: false };

		const signature = parameters.get('signature');
		if (typeof signature !== 'string') return { ok: false };

		const created = parameters.get('created') ?? null;
		if (typeof created === 'string') return { ok: false };

		const expires = parameters.get('expires') ?? null;
		if (typeof expires === 'string') return { ok: false };

		const headers = ((): Result<{ name: string; special: boolean }[] | null, never> => {
			const value = parameters.get('headers') ?? null;
			if (typeof value === 'number') return { ok: false };
			if (value === '') return { ok: false };
			if (value === null) return { ok: true, value: null };

			const parsedHeaders = parseHeaders(value);
			if (!parsedHeaders.ok) return { ok: false };

			const allNormalHeaderNamesAreUnique = isUniqueArray(
				parsedHeaders.value
					.filter(({ special }) => !special)
					.map(({ name }) => name),
			);
			if (!allNormalHeaderNamesAreUnique) return { ok: false };

			const allSpecialHeaderNamesAreUnique = isUniqueArray(
				parsedHeaders.value
					.filter(({ special }) => special)
					.map(({ name }) => name),
			);
			if (!allSpecialHeaderNamesAreUnique) return { ok: false };

			return parsedHeaders;
		})();
		if (!headers.ok) return { ok: false };

		return {
			ok: true,
			value: new Signature(
				keyId,
				signature,
				created,
				expires,
				headers.value,
			),
		};
	}

	private constructor(
		public readonly keyId: string,
		public readonly signature: string,
		public readonly created: number | null,
		public readonly expires: number | null,
		public readonly headers: { name: string; special: boolean }[] | null,
	) {}

	/**
	 * 作成日時が不正だったりすでに失効済みだったりしないか確認する
	 *
	 * @param timestamp 現在時刻（秒数）
	 * @param clockSkew 許される誤差（秒数）
	 *
	 * ```ts
	 * signature.isValidAt(Date.now() / 1000, 5 * 60);
	 * ```
	 */
	public isValidAt(timestamp: number, clockSkew = 300): boolean {
		if (this.created !== null) {
			if (this.created - timestamp > clockSkew) return false;
		}

		if (this.expires !== null) {
			if (timestamp - this.expires > clockSkew) return false;
		}

		return true;
	}

	/**
	 * 引数として渡された最低限必要なヘッダーがすべて署名に含まれることを確認する
	 */
	public has(requiredHeaders: { name: string; special: boolean }[]): boolean {
		return requiredHeaders.every((requiredHeader) => {
			return (this.headers ?? []).some((header) => {
				if (header.special !== requiredHeader.special) return false;
				if (header.name !== requiredHeader.name) return false;
				return true;
			});
		});
	}

	/**
	 * 署名の検証用に署名に使われた文字列を復元する
	 */
	public recreate(method: string, url: string, headers: Map<string, string>): Result<string, never> {
		const targetHeaders = this.headers ?? [{ name: 'created', special: true }];

		const lines = targetHeaders.map<Result<string, never>>((targetHeader) => {
			if (targetHeader.special) {
				switch (targetHeader.name) {
					case 'request-target': {
						return { ok: true, value: `(${targetHeader.name}): ${method.toLowerCase()} ${url}` };
					}
					case 'created': {
						return { ok: true, value: `(${targetHeader.name}): ${this.created}` };
					}
					case 'expires': {
						return { ok: true, value: `(${targetHeader.name}): ${this.expires}` };
					}
					default: {
						return { ok: false };
					}
				}
			} else {
				const value = headers.get(targetHeader.name);
				if (value === undefined) return { ok: false };
				return { ok: true, value: `${targetHeader.name}: ${value}` };
			}
		});

		if (lines.some(({ ok }) => !ok)) return { ok: false };

		return {
			ok: true,
			value: lines
				.filter(result => result.ok) // 型推論のため
				.map(({ value }) => value)
				.join('\n'),
		};
	}
}
