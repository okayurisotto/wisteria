import { expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { repeat } from './repeat.js';

const p = /^a/;
const parser = repeat(pattern(p));

for (let i = 0; i < 4; i++) {
	const input = 'a'.repeat(i);

	test(`repeat(${p}) が '${input}' をパースできる`, () => {
		const result = parser(input, 0);
		expect(result.ok).toBe(true);
		expect(result.offset).toBe(input.length);
	});
}

for (let i = 0; i < 4; i++) {
	const input = `${'a'.repeat(i)}b`;

	test(`repeat(${p}) が '${input}' をパースできる`, () => {
		const result = parser(input, 0);
		expect(result.ok).toBe(true);
		expect(result.offset).toBe(input.length - 1);
	});
}
