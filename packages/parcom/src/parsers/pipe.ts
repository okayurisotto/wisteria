import type { Parser, InferParsers } from '../type.js';

export const pipe = <T extends Parser<unknown>[]>(
	parsers: [...T],
): Parser<InferParsers<T>> => {
	return (input, offset) => {
		const values: unknown[] = [];

		for (const parser of parsers) {
			const result = parser(input, offset);
			if (!result.ok) return result;

			values.push(result.value);
			offset = result.offset;
		}

		return {
			ok: true,
			value: values as InferParsers<T>,
			offset,
		};
	};
};
