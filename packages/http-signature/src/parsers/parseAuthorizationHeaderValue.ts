import { map, pattern, pipe, type Parser } from 'parcom';
import { parseSignatureHeaderValue } from './parseSignatureHeaderValue.js';

export const parseAuthorizationHeaderValue: Parser<
	{ key: string; value: string }[]
> = (value, offset) => {
	return map(
		pipe([pattern(/^Signature /), parseSignatureHeaderValue]),
		([, v]) => v,
	)(value, offset);
};
