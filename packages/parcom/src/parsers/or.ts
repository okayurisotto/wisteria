import type { Parser } from '../type.js';

export const or = <T>(parsers: Parser<T>[]): Parser<T> => {
	return (input, offset) => {
		for (const parser of parsers) {
			const result = parser(input, offset);
			if (result.ok) return result;
		}

		return { ok: false, offset };
	};
};
