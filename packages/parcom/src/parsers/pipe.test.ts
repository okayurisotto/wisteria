import { expect, test } from 'vitest';
import { pattern } from './pattern.js';
import { pipe } from './pipe.js';

test(`/^a/ |> /^b/ can parse 'ab'`, () => {
	const parser = pipe([pattern(/^a/), pattern(/^b/)]);
	const input = 'ab';
	const result = parser(input, 0);

	expect(result.ok).toBe(true);
	expect(result.offset).toBe(input.length);
});
