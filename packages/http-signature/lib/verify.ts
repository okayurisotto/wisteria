// Copyright 2015 Joyent, Inc.

import type { BinaryLike } from 'node:crypto';
import assert from 'assert-plus';
import sshpk from 'sshpk';
import { validateAlgorithm } from './utils.js';

/**
 * Verify RSA/DSA signature against public key.  You are expected to pass in
 * an object that was returned from `parse()`.
 *
 * @param parsedSignature the object you got from `parse`.
 * @param pubkey RSA/DSA private key PEM.
 * @return true if valid, false otherwise.
 * @throws {TypeError} if you pass in bad arguments.
 * @throws {InvalidAlgorithmError}
 */
export const verifySignature = (
	parsedSignature: {
		algorithm: string;
		signingString: BinaryLike;
		params: { signature: string | Buffer };
	},
	pubkey: string | Buffer | sshpk.Key,
): boolean => {
	assert.object(parsedSignature, 'parsedSignature');

	let pubkey_: sshpk.Key;
	if (typeof pubkey === 'string' || Buffer.isBuffer(pubkey)) {
		pubkey_ = sshpk.parseKey(pubkey);
	} else {
		pubkey_ = pubkey;
	}
	assert.ok(sshpk.Key.isKey(pubkey_, [1, 1]), 'pubkey must be a sshpk.Key');

	const [keyAlgorithm, hashAlgorithm] = validateAlgorithm(parsedSignature.algorithm, pubkey_.type);
	if (keyAlgorithm === 'hmac' || keyAlgorithm !== pubkey_.type) return false;

	const verify = pubkey_.createVerify(hashAlgorithm);
	verify.update(parsedSignature.signingString);
	return verify.verify(parsedSignature.params.signature, 'base64');
};
