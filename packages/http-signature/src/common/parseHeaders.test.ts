import { test, expect } from 'vitest';
import { parseHeaders } from './parseHeaders';

test('can parse headers parameter', () => {
	const input = '(request-target) (created) (expires) host date digest content-length';
	const result = parseHeaders(input);

	expect(result.ok).toBe(true);
	expect(result.value).toStrictEqual([
		{ name: 'request-target', special: true },
		{ name: 'created', special: true },
		{ name: 'expires', special: true },
		{ name: 'host', special: false },
		{ name: 'date', special: false },
		{ name: 'digest', special: false },
		{ name: 'content-length', special: false },
	]);
});
