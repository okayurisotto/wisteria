import { expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { map } from './map.js';

test(`/^([a-z])([a-z]+)/ can parse 'foo' and convert 'Foo'`, () => {
	const parser = map(pattern(/^([a-z])([a-z]+)/), ([, first, rest]) => {
		if (first === undefined) throw new Error();
		if (rest === undefined) throw new Error();
		return first.toUpperCase() + rest;
	});
	const input = 'foo';
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
	expect(result.value).toBe('Foo');
});
