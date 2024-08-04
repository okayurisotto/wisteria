import { test, expect, describe } from 'vitest';
import { Signature } from './Signature.js';

describe('isValidAt()', () => {
	test('valid', () => {
		const input = `keyId="rsa-key-1",algorithm="hs2019",headers="(request-target) (created) host digest content-length",signature="Base64(RSA-SHA512(signing string))"`;
		const result = Signature.from(input, 'signature');

		expect(result.ok).toBe(true);
		expect(result.value?.isValidAt(Date.now() / 1000)).toBe(true);
	});

	test('invalid created', () => {
		const now = Math.floor(Date.now() / 1000);
		const clockSkew = 300;

		const input = `keyId="rsa-key-1",algorithm="hs2019",created=${now + clockSkew + 1},headers="(request-target) (created) host digest content-length",signature="Base64(RSA-SHA512(signing string))"`;
		const result = Signature.from(input, 'signature');

		expect(result.ok).toBe(true);
		expect(result.value?.isValidAt(now, clockSkew)).toBe(false);
	});

	test('invalid expires', () => {
		const now = Math.floor(Date.now() / 1000);
		const clockSkew = 300;

		const input = `keyId="rsa-key-1",algorithm="hs2019",expires=${now - clockSkew - 1},headers="(request-target) (created) host digest content-length",signature="Base64(RSA-SHA512(signing string))"`;
		const result = Signature.from(input, 'signature');

		expect(result.ok).toBe(true);
		expect(result.value?.isValidAt(now, clockSkew)).toBe(false);
	});
});

test('recreate', () => {
	const now = Math.floor(Date.now() / 1000);
	const digest = 'FOOBARBUZ';

	const input = `keyId="rsa-key-1",algorithm="hs2019",created=${now},headers="(request-target) (created) host digest",signature="Base64(RSA-SHA512(signing string))"`;
	const result = Signature.from(input, 'signature');

	const recreateResult = result.value?.recreate(
		'POST',
		'/inbox?key=value',
		new Map([
			['host', 'https://www.example.com'],
			['digest', digest],
		]),
	);

	expect(result.ok).toBe(true);
	expect(recreateResult?.value).toBe([
		`(request-target): post /inbox?key=value`,
		`(created): ${now}`,
		'host: https://www.example.com',
		`digest: ${digest}`,
	].join('\n'));
});
