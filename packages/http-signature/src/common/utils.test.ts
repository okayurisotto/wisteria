import { test, expect, describe } from 'vitest';
import { isUniqueArray, safeParseInteger } from './utils.js';

describe('isUniqueArray', () => {
	test('unique array', () => {
		expect(isUniqueArray([1, 2, 3])).toBe(true);
	});

	test('non-unique array', () => {
		expect(isUniqueArray([1, 1, 2])).toBe(false);
	});
});

describe('safeParseInteger', () => {
	test('valid input', () => {
		const result = safeParseInteger('123');

		expect(result.ok).toBe(true);
		expect(result.value).toBe(123);
	});

	test('invalid input', () => {
		const result = safeParseInteger('foo');

		expect(result.ok).toBe(false);
	});
});
