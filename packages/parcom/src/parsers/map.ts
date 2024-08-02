import type { Parser } from '../type.js';

export const map = <T, U>(
	parser: Parser<T>,
	fn: (value: T) => U,
): Parser<U> => {
	return (input, offset) => {
		const result = parser(input, offset);

		if (result.ok) {
			return {
				ok: true,
				value: fn(result.value),
				offset: result.offset,
			};
		} else {
			return result;
		}
	};
};
