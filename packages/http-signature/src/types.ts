export type ParseRequestOption = {
	/**
	 * Algorithms to support.
	 */
	algorithm?: string;

	/**
	 * The name of the header to use as the authorization header.
	 *
	 * @default 'authorization' | 'signature'
	 */
	authorizationHeaderName?: string;

	/**
	 * The allowed clock skew in seconds.
	 *
	 * @default 300
	 */
	clockSkew?: number;

	/**
	 * Required header names.
	 *
	 * @default []
	 */
	requiredHeaders?: string[];

	/**
	 * Whether to force a latest spec analysis.
	 *
	 * @default false
	 */
	strict?: boolean;
};

export interface ParsedSignature {
	/**
	 *
	 */
	algorithm: string;

	/**
	 *
	 */
	keyId: string;

	/**
	 *
	 */
	opaque: string | undefined; // ?

	/**
	 * @deprecated
	 */
	scheme: string;

	/**
	 * ready to be passed to `crypto.verify()`
	 */
	signingString: string;

	/**
	 *
	 */
	params: {
		algorithm: string;
		headers: string[];
		keyId: string;
		signature: string;
	};
}
