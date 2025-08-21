import type * as API from './autogen.js';

type ValueOf<T> = T[keyof T];
type OmitLeadingSlash<T> = T extends `/${infer U}` ? U : T;

export type Endpoints = {
	[K in keyof API.paths as OmitLeadingSlash<K>]: {
		request: ValueOf<API.paths[K]['post']['requestBody']['content']>;
		response: 204 extends keyof API.paths[K]['post']['responses']
			? null
			: {
				[L in keyof API.paths[K]['post']['responses']]: ValueOf<ValueOf<API.paths[K]['post']['responses'][L]>>;
			}[keyof API.paths[K]['post']['responses'] & 200];
	};
};

const MK_API_ERROR = Symbol();

export type APIError = {
	id: string;
	code: string;
	message: string;
	kind: 'client' | 'server';
	info: Record<string, any>;
};

export function isAPIError(reason: Record<PropertyKey, unknown>): reason is APIError {
	return reason[MK_API_ERROR] === true;
}

export type FetchLike = (input: string, init?: {
	method?: string;
	body?: string;
	credentials?: RequestCredentials;
	cache?: RequestCache;
	headers: { [key in string]: string }
}) => Promise<{
	status: number;
	json(): Promise<any>;
}>;

export class APIClient {
	public origin: string;
	public credential: string | null | undefined;
	public fetch: FetchLike;

	constructor(opts: {
		origin: APIClient['origin'];
		credential?: APIClient['credential'];
		fetch?: APIClient['fetch'] | null | undefined;
	}) {
		this.origin = opts.origin;
		this.credential = opts.credential;
		// ネイティブ関数をそのまま変数に代入して使おうとするとChromiumではIllegal invocationエラーが発生するため、
		// 環境で実装されているfetchを使う場合は無名関数でラップして使用する
		this.fetch = opts.fetch ?? ((...args) => fetch(...args));
	}

	public request<
		Endpoint extends keyof Endpoints,
		Params extends Endpoints[Endpoint]['request'],
		Response extends Endpoints[Endpoint]['response']
	>(
		endpoint: Endpoint,
		params: Params = {} as Params,
	) {
		return new Promise<Response>((resolve, reject) => {
			this.fetch(`${this.origin}/api/${endpoint}`, {
				method: 'POST',
				body: JSON.stringify(params),
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				cache: 'no-cache',
			}).then(async (res) => {
				const body = res.status === 204 ? null : await res.json();

				if (res.status === 200 || res.status === 204) {
					resolve(body);
				} else {
					reject({
						[MK_API_ERROR]: true,
						...body.error,
					});
				}
			}).catch(reject);
		});
	}
}
