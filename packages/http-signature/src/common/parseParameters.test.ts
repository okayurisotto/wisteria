import { test, expect } from 'vitest';
import { parseParametersAsAuthorizationHeaderValue, parseParametersAsSignatureHeaderValue } from './parseParameters.js';

test('can parse parameters', () => {
	const input = `keyId="rsa-key-1",algorithm="hs2019",headers="(request-target) (created) host digest content-length",signature="Base64(RSA-SHA512(signing string))"`;

	{
		const result = parseParametersAsSignatureHeaderValue(input);

		expect(result.ok).toBe(true);
		expect(result.value).toStrictEqual([
			{ key: 'keyId', value: 'rsa-key-1' },
			{ key: 'algorithm', value: 'hs2019' },
			{ key: 'headers', value: '(request-target) (created) host digest content-length' },
			{ key: 'signature', value: 'Base64(RSA-SHA512(signing string))' },
		]);
	}

	{
		const result = parseParametersAsAuthorizationHeaderValue('Signature ' + input);

		expect(result.ok).toBe(true);
		expect(result.value).toStrictEqual([
			{ key: 'keyId', value: 'rsa-key-1' },
			{ key: 'algorithm', value: 'hs2019' },
			{ key: 'headers', value: '(request-target) (created) host digest content-length' },
			{ key: 'signature', value: 'Base64(RSA-SHA512(signing string))' },
		]);
	}
});

test('can parse parameters, including numeric parameter', () => {
	const input = `keyId="rsa-key-1",algorithm="hs2019",created=1402170695,expires=1402170995,headers="(request-target) (created) (expires) host date digest content-length",signature="Base64(RSA-SHA256(signing string))"`;

	{
		const result = parseParametersAsSignatureHeaderValue(input);

		expect(result.ok).toBe(true);
		expect(result.value).toStrictEqual([
			{ key: 'keyId', value: 'rsa-key-1' },
			{ key: 'algorithm', value: 'hs2019' },
			{ key: 'created', value: 1402170695 },
			{ key: 'expires', value: 1402170995 },
			{ key: 'headers', value: '(request-target) (created) (expires) host date digest content-length' },
			{ key: 'signature', value: 'Base64(RSA-SHA256(signing string))' },
		]);
	}

	{
		const result = parseParametersAsAuthorizationHeaderValue('Signature ' + input);

		expect(result.ok).toBe(true);
		expect(result.value).toStrictEqual([
			{ key: 'keyId', value: 'rsa-key-1' },
			{ key: 'algorithm', value: 'hs2019' },
			{ key: 'created', value: 1402170695 },
			{ key: 'expires', value: 1402170995 },
			{ key: 'headers', value: '(request-target) (created) (expires) host date digest content-length' },
			{ key: 'signature', value: 'Base64(RSA-SHA256(signing string))' },
		]);
	}
});
