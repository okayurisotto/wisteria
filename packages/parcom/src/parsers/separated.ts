import type { Parser } from '../type.js';
import { map } from './map.js';
import { pipe } from './pipe.js';
import { repeat } from './repeat.js';

export const separated = <T>(
	parser: Parser<T>,
	separator: Parser<unknown>,
): Parser<T[]> => {
	const firstParser = parser;
	const restParser = repeat(map(pipe([separator, parser]), ([, v]) => v));

	return (input, offset) => {
		const first = firstParser(input, offset);
		if (!first.ok) return first;

		const rest = restParser(input, first.offset);

		if (rest.ok) {
			return {
				ok: true,
				value: [first.value, ...rest.value],
				offset: rest.offset,
			};
		} else {
			return {
				ok: true,
				value: [first.value],
				offset: first.offset,
			};
		}
	};
};
