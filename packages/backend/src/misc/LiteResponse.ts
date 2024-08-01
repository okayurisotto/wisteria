import type { Context } from 'hono';

export class LiteResponse<
	T extends NonNullable<unknown> = NonNullable<unknown>,
> {
	public static empty(
		code: number,
		headers = new Map<string, string>(),
	): LiteResponse<never> {
		return new LiteResponse<never>(code, null, headers, true);
	}

	public static from<T extends NonNullable<unknown>>(
		code: number,
		data: T | null,
		headers = new Map<string, string>(),
	): LiteResponse<T> {
		return new LiteResponse<T>(code, data, headers, false);
	}

	private constructor(
		private readonly code: number,
		private readonly data: T | null,
		private readonly headers: Map<string, string>,
		private readonly empty: boolean,
	) {}

	public reply(c: Context): Response {
		c.status(this.code); // TODO

		for (const [key, value] of this.headers) {
			c.header(key, value);
		}

		if (this.empty) {
			return c.body(null);
		} else {
			return c.json(this.data);
		}
	}
}
