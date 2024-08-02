export type Parser<T> = (input: string, offset: number) => ParserResult<T>;

export type InferParser<T extends Parser<unknown>> =
	T extends Parser<infer U> ? U : never;

export type InferParsers<T extends Parser<unknown>[]> = T extends [
	infer U,
	...infer V,
]
	? U extends Parser<unknown>
		? V extends Parser<unknown>[]
			? [InferParser<U>, ...InferParsers<V>]
			: never
		: never
	: [];

export type ParserResult<T> =
	| { ok: true; value: T; offset: number }
	| { ok: false; offset: number };
