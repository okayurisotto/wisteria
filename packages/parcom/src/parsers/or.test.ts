import { expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { or } from './or.js';

test(`/^foo/ or /^barrrr/ can parse 'foo'`, () => {
	const parser = or([pattern(/^foo/), pattern(/^barrrr/)]);
	const result = parser('foo', 0);
	expect(result.ok).toBe(true);
	expect(result.offset).toBe(3);
});

test(`/^foo/ or /^barrrr/ can parse 'barrrr'`, () => {
	const parser = or([pattern(/^foo/), pattern(/^barrrr/)]);
	const result = parser('barrrr', 0);
	expect(result.ok).toBe(true);
	expect(result.offset).toBe(6);
});

test(`/^foo/ or /^barrrr/ cannot parse 'buz'`, () => {
	const parser = or([pattern(/^foo/), pattern(/^barrrr/)]);
	const result = parser('buz', 0);
	expect(result.ok).toBe(false);
	expect(result.offset).toBe(0);
});

test(`/^foo/ or /^fooooo/ can parse 'fooooo' using /^foo/`, () => {
	const parser = or([pattern(/^foo/), pattern(/^foooo/)]);
	const result = parser('fooooo', 0);
	expect(result.ok).toBe(true);
	expect(result.offset).toBe(3);
});
