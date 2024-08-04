export type Result<T, U> =
	| { ok: true; value: T; error?: never }
	| { ok: false; value?: never; error?: U };
