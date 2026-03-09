import { expect, test, describe } from 'vitest';
import { pattern } from './pattern.js';
import { or } from './or.js';

const items = [
	{ value: "a", pattern: /^a/ },
	{ value: "bb", pattern: /^bb/ },
	{ value: "ccc", pattern: /^ccc/ },
];
const invalidPattern1 = /^dddd/;
const invalidPattern2 = /^eeeee/;

describe("正常系", () => {
	for (const a of items) {
		for (const b of items) {
			if (a === b) continue;

			test(`${a.pattern} or ${b.pattern} で '${a.value}' がパースできる`, () => {
				const parser = or([pattern(a.pattern), pattern(b.pattern)]);
				const result = parser(a.value, 0);

				expect(result.ok).toBe(true);
				expect(result.offset).toBe(a.value.length);
			});

			test(`${a.pattern} or ${b.pattern} で '${b.value}' がパースできる`, () => {
				const parser = or([pattern(a.pattern), pattern(b.pattern)]);
				const result = parser(b.value, 0);

				expect(result.ok).toBe(true);
				expect(result.offset).toBe(b.value.length);
			});
		}
	}
});

describe("異常系", () => {
	for (const item of items) {
		test(`${invalidPattern1} or ${invalidPattern2} では '${item.value}' がパースできない`, () => {
			const parser = or([pattern(invalidPattern1), pattern(invalidPattern2)]);
			const result = parser(item.value, 0);

			expect(result.ok).toBe(false);
			expect(result.offset).toBe(0);
		});
	}
});
