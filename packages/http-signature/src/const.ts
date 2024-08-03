export const HASH_ALGOS = ['sha1', 'sha256', 'sha512'] as const;

export const PK_ALGOS = ['rsa', 'dsa', 'ecdsa', 'ed25519'] as const;

export const HEADER = {
	Authorization: 'authorization',
	Signature: 'signature',
} as const;
