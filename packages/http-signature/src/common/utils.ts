import type { Result } from './types.js';

export const isUniqueArray = <T>(values: T[]): boolean => {
	return new Set(values).size === values.length;
};

export const safeParseInteger = (value: string): Result<number, never> => {
	const result = parseInt(value);

	if (Number.isNaN(result)) {
		return { ok: false };
	} else {
		return { ok: true, value: result };
	}
};
