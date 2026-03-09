import { test, expect, describe } from 'vitest';
import { pattern } from './pattern.js';

const items = [
	{ value: "a", pattern: /^a/ },
	{ value: "bb", pattern: /^bb/ },
	{ value: "ccc", pattern: /^ccc/ },
];
const invalidPattern = /^dddd/;

describe("正常系", () => {
	for (const item of items) {
		test(`${item.pattern} で '${item.value}' がパースできる`, () => {
			const parser = pattern(item.pattern);
			const result = parser(item.value, 0);

			expect(result.ok).toBe(true);
			expect(result.offset).toBe(item.value.length);
		});
	}

	for (const item of items) {
		test(`offset が 1 なら ${item.pattern} で '_${item.value}' がパースできる`, () => {
			const parser = pattern(item.pattern);
			const result = parser(`_${item.value}`, 1);

			expect(result.ok).toBe(true);
			expect(result.offset).toBe(1 + item.value.length);
		});
	}

	test(`キャプチャグループが使える`, () => {
		const input = 'foobarbuz123';
		const parser = pattern(/^([a-z]+)(\d+)/);
		const result = parser(input, 0);

		expect(result.ok).toBe(true);
		expect(result.offset).toBe(input.length);
		expect(result.value?.[1]).toBe('foobarbuz');
		expect(result.value?.[2]).toBe('123');
	});
});

describe("異常系", () => {
	for (const item of items) {
		test(`${invalidPattern} では '${item.value}' がパースできない`, () => {
			const parser = pattern(invalidPattern);
			const result = parser(item.value, 0);

			expect(result.ok).toBe(false);
			expect(result.offset).toBe(0);
		});
	}
});
