import type { Parser } from '../type.js';

export const pattern = (pattern: RegExp): Parser<RegExpMatchArray> => {
	return (input, offset) => {
		const matchResult = input.substring(offset).match(pattern);

		if (matchResult !== null) {
			return {
				ok: true,
				value: matchResult,
				offset: offset + matchResult[0].length,
			};
		} else {
			return { ok: false, offset };
		}
	};
};
