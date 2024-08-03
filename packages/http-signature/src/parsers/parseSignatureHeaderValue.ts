import { map, or, pattern, separated, type Parser } from 'parcom';

export const parseSignatureHeaderValue: Parser<
	{ key: string; value: string }[]
> = (value, offset) => {
	const parameter = map(
		or([pattern(/^([A-Za-z]+)="([^"]+)"/), pattern(/^([A-Za-z]+)=(\d+)/)]),
		([, key, value]) => {
			if (key === undefined) throw new Error();
			if (value === undefined) throw new Error();
			return { key, value };
		},
	);
	const separator = pattern(/^,/);
	const parameters = separated(parameter, separator);

	return parameters(value, offset);
};
