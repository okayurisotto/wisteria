import type { Parser } from '../type.js';

export const repeat = <T>(parser: Parser<T>): Parser<T[]> => {
	return (input, offset) => {
		const values: T[] = [];

		for (;;) {
			const result = parser(input, offset);

			if (result.ok) {
				values.push(result.value);
				offset = result.offset;
			} else {
				return { ok: true, value: values, offset };
			}
		}
	};
};
