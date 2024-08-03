import { expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { repeat } from './repeat.js';

test(`/^a/ can parse 'aaaaaa'`, () => {
	const input = 'aaaaaa';
	const parser = repeat(pattern(/^a/));
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
});

test(`/^a/ can parse 'aaaaaabbbbbb' to 'bbbbbb'`, () => {
	const input = 'aaaaaabbbbbb';
	const parser = repeat(pattern(/^a/));
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(6);
});

test(`/^a/ can parse empty string`, () => {
	const input = '';
	const parser = repeat(pattern(/^a/));
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
});
