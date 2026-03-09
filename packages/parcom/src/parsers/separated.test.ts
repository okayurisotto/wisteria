import { describe, expect, test } from 'vitest';
import { separated } from './separated.js';
import { pattern } from './pattern.js';

const item = { values: ['foo', 'bar', 'buz'], pattern: /^\w+/ };
const sep = { value: ',', pattern: /^,/ };
const suffix = '+';

describe("正常系", () => {
	for (let i = 1; i <= item.values.length; i++) {
		test(`${item.pattern} separated by ${sep.pattern} can parse '${item.values.slice(0, i)}'`, () => {
			const parser = separated(pattern(item.pattern), pattern(sep.pattern));
			const input = item.values.slice(0, i).join(sep.value);
			const result = parser(input, 0);

			expect(result.ok).toBe(true);
			expect(result.offset).toBe(input.length);
			expect(result.value?.map(([v]) => v)).toStrictEqual(item.values.slice(0, i));
		});
	}

	for (let i = 1; i <= item.values.length; i++) {
		test(`${item.pattern} separated by ${sep.pattern} can parse '${item.values.slice(0, i)}${suffix}'`, () => {
			const parser = separated(pattern(item.pattern), pattern(sep.pattern));
			const input = item.values.slice(0, i).join(sep.value) + suffix;
			const result = parser(input, 0);

			expect(result.ok).toBe(true);
			expect(result.offset).toBe(input.length - suffix.length);
			expect(result.value?.map(([v]) => v)).toStrictEqual(item.values.slice(0, i));
		});
	}
});

describe("異常系", () => {
	test(`${item.pattern} separated by ${sep.pattern} cannot parse ''`, () => {
		const parser = separated(pattern(item.pattern), pattern(sep.pattern));
		const input = "";
		const result = parser(input, 0);

		expect(result.ok).toBe(false);
		expect(result.offset).toBe(0);
	});
});
