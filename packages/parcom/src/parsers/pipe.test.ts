import { describe, expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { pipe } from './pipe.js';

const items = [
	{ value: "a", pattern: /^a/ },
	{ value: "bb", pattern: /^bb/ },
	{ value: "ccc", pattern: /^ccc/ },
];
const invalidPattern = /^dddd/;

describe("正常系", () => {
	for (const a of items) {
		for (const b of items) {
			test(`${a.pattern} |> ${b.pattern} で '${a.value}${b.value}' がパースできる`, () => {
				const parser = pipe([pattern(a.pattern), pattern(b.pattern)]);
				const input = a.value + b.value;
				const result = parser(input, 0);

				expect(result.ok).toBe(true);
				expect(result.offset).toBe(a.value.length + b.value.length);
			});
		}
	}
});

describe("異常系", () => {
	for (const item of items) {
		test(`${item.pattern} |> ${invalidPattern} では '${item.value}' がパースできない`, () => {
			const parser = pipe([pattern(item.pattern), pattern(invalidPattern)]);
			const input = item.value;
			const result = parser(input, 0);

			expect(result.ok).toBe(false);
			expect(result.offset).toBe(item.value.length);
		});
	}

	for (const item of items) {
		test(`${invalidPattern} |> ${item.pattern} では '${item.value}' がパースできない`, () => {
			const parser = pipe([pattern(invalidPattern), pattern(item.pattern)]);
			const input = item.value;
			const result = parser(input, 0);

			expect(result.ok).toBe(false);
			expect(result.offset).toBe(0);
		});
	}
});
