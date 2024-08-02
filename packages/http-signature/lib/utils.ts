// Copyright 2012 Joyent, Inc.  All rights reserved.

import assert from 'assert-plus';
import type { AlgorithmHashType } from 'sshpk';

const HASH_ALGOS = {
	sha1: true,
	sha256: true,
	sha512: true,
};

const PK_ALGOS = {
	rsa: true,
	dsa: true,
	ecdsa: true,
	ed25519: true,
};

export const HEADER = {
	AUTH: 'authorization',
	SIG: 'signature',
};

export class HttpSignatureError extends Error {
	constructor(message: string, caller: { name: string }) {
		super(message);
		this.name = caller.name;
	}
}

export class InvalidAlgorithmError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidAlgorithmError);
	}
}

/**
 * @param algorithm the algorithm of the signature
 * @param publicKeyType fallback algorithm (public key type) for hs2019
 */
export const validateAlgorithm = (
	algorithm: string,
	publicKeyType?: string | undefined,
): [keyAlgorithm: string, hashAlgorithm: AlgorithmHashType] => {
	assert.string(algorithm, 'algorithm');
	assert.optionalString(publicKeyType, 'publicKeyType');

	const alg = algorithm.toLowerCase().split('-');
	const [keyAlgorithm, hashAlgorithm] = alg;

	if (keyAlgorithm === 'hs2019') {
		if (publicKeyType === 'ed25519') {
			return validateAlgorithm('ed25519-sha512');
		} else if (publicKeyType !== undefined) {
			return validateAlgorithm(publicKeyType + '-sha256');
		}

		return ['hs2019', 'sha256'];
	}

	if (keyAlgorithm === undefined || hashAlgorithm === undefined) {
		throw new InvalidAlgorithmError(algorithm + ' is not a valid algorithm');
	}

	if (alg.length !== 2) {
		throw new InvalidAlgorithmError(
			keyAlgorithm.toUpperCase() + ' is not a valid algorithm',
		);
	}

	if (keyAlgorithm !== 'hmac' && !(keyAlgorithm in PK_ALGOS)) {
		throw new InvalidAlgorithmError(
			keyAlgorithm.toUpperCase() + ' type keys are not supported',
		);
	}

	if (!(hashAlgorithm in HASH_ALGOS)) {
		throw new InvalidAlgorithmError(
			hashAlgorithm.toUpperCase() + ' is not a supported hash algorithm',
		);
	}

	return [keyAlgorithm, hashAlgorithm];
};
