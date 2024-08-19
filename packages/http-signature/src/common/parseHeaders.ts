import { map, or, pattern, separated } from 'parcom';
import type { Result } from './types.js';

const normalHeaderFieldName = map(
	pattern(/^([a-z-]+)/),
	([, name]) => {
		if (name === undefined) throw new Error();

		return { name, special: false };
	},
);

const specialHeaderFieldName = map(
	pattern(/^\(([a-z-]+)\)/),
	([, name]) => {
		if (name === undefined) throw new Error();

		return { name, special: true };
	},
);

const headerFieldName = or([normalHeaderFieldName, specialHeaderFieldName]);

const separator = pattern(/^ /);

const headerFieldNames = separated(headerFieldName, separator);

export const parseHeaders = (value: string): Result<{ name: string; special: boolean }[], never> => {
	const result = headerFieldNames(value, 0);

	if (result.ok && result.offset === value.length) {
		return { ok: true, value: result.value };
	} else {
		return { ok: false };
	}
};
