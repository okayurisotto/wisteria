import { FastifyReply } from 'fastify';

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

	public reply(reply: FastifyReply): void {
		void reply.code(this.code);

		for (const [key, value] of this.headers) {
			void reply.header(key, value);
		}

		if (this.empty) {
			void reply.send();
		} else {
			if (typeof this.data === 'string') {
				// 文字列を返す場合は、`JSON.stringify()`を通さなければFastifyにJSONと認識されない
				void reply.send(JSON.stringify(this.data));
			} else {
				void reply.send(this.data);
			}
		}
	}
}
