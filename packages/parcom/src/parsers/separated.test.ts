import { expect, test } from 'vitest';
import { separated } from './separated.js';
import { pattern } from './pattern.js';

test(`/^\\w+/ separated by /^,/ can parse 'foo,bar,buz'`, () => {
	const parser = separated(pattern(/^\w+/), pattern(/^,/));
	const input = 'foo,bar,buz';
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
	expect(result.value?.map(([v]) => v)).toStrictEqual(['foo', 'bar', 'buz']);
});

test(`/^\\w+/ separated by /^,/ can parse 'foo,bar_' to underscore`, () => {
	const parser = separated(pattern(/^\w+/), pattern(/^,/));
	const input = 'foo,bar ';
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length - 1);
	expect(result.value?.map(([v]) => v)).toStrictEqual(['foo', 'bar']);
});
