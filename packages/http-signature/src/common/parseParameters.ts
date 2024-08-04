import type { Result } from './types.js';
import { map, or, pattern, pipe, separated } from 'parcom';
import { safeParseInteger } from './utils.js';

const quotedParameter = map(
	pattern(/^([A-Za-z]+)="([^"]+)"/),
	([, key, value]) => {
		if (key === undefined) throw new Error();
		if (value === undefined) throw new Error();
		return { key, value };
	},
);

const numericParameter = map(
	pattern(/^([A-Za-z]+)=(\d+)/),
	([, key, value]) => {
		if (key === undefined) throw new Error();
		if (value === undefined) throw new Error();

		const parseResult = safeParseInteger(value);
		if (!parseResult.ok) throw new Error();

		return { key, value: parseResult.value };
	},
);

const parameter = or<{
	key: string;
	value: string | number;
}>([quotedParameter, numericParameter]);

const separator = pattern(/^,/);

const parameters = separated(parameter, separator);

export const parseParametersAsAuthorizationHeaderValue = (
	value: string,
): Result<{ key: string; value: string | number }[], never> => {
	const result = map(pipe([pattern(/^Signature /), parameters]), ([, v]) => v)(value, 0);

	if (result.ok && result.offset === value.length) {
		return result;
	} else {
		return { ok: false };
	}
};

export const parseParametersAsSignatureHeaderValue = (
	value: string,
): Result<{ key: string; value: string | number }[], never> => {
	const result = parameters(value, 0);

	if (result.ok && result.offset === value.length) {
		return result;
	} else {
		return { ok: false };
	}
};
