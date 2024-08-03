import { test, expect } from 'vitest';
import { pattern } from './pattern.js';

test(`/^foo/ can parse 'foo'`, () => {
	const input = 'foo';
	const parser = pattern(/^foo/);
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
});

test(`/^foo/ cannot parse 'bar'`, () => {
	const input = 'bar';
	const parser = pattern(/^foo/);
	const result = parser(input, 0);

	expect(result.ok).toBe(false);
	expect(result.offset).toBe(0);
});

test(`/^foo/ can parse '_foo' when offset is 1`, () => {
	const input = '_foo';
	const parser = pattern(/^foo/);
	const result = parser(input, 1);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
});

test(`capture groups can be used`, () => {
	const input = 'foobarbuz123';
	const parser = pattern(/^([a-z]+)(\d+)/);
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
	expect(result.value?.[1]).toBe('foobarbuz');
	expect(result.value?.[2]).toBe('123');
});
