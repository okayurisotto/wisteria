import { PK_ALGOS, HASH_ALGOS } from './const.js';
import { includes } from './utils/includes.js';
import { InvalidAlgorithmError } from './errors.js';

type ValidatedAlgorithm = [
	keyAlgorithm: (typeof PK_ALGOS)[number] | 'hs2019' | 'hmac',
	hashAlgorithm: (typeof HASH_ALGOS)[number],
];

/**
 * @param algorithm the algorithm of the signature
 * @param publicKeyType fallback algorithm (public key type) for hs2019
 */
export const validateAlgorithm = (
	algorithm: string,
	publicKeyType?: string | undefined,
): ValidatedAlgorithm => {
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

	if (keyAlgorithm !== 'hmac' && !includes(PK_ALGOS, keyAlgorithm)) {
		throw new InvalidAlgorithmError(
			keyAlgorithm.toUpperCase() + ' type keys are not supported',
		);
	}

	if (!includes(HASH_ALGOS, hashAlgorithm)) {
		throw new InvalidAlgorithmError(
			hashAlgorithm.toUpperCase() + ' is not a supported hash algorithm',
		);
	}

	return [keyAlgorithm, hashAlgorithm];
};
