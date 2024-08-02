// Copyright 2015 Joyent, Inc.

import assert from 'assert-plus';
import type { BinaryLike } from 'crypto';
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
	pubkey_: string | Buffer | sshpk.Key,
): boolean => {
	assert.object(parsedSignature, 'parsedSignature');

	let pubkey: sshpk.Key;
	if (typeof pubkey_ === 'string' || Buffer.isBuffer(pubkey_)) {
		pubkey = sshpk.parseKey(pubkey_);
	} else {
		pubkey = pubkey_;
	}
	assert.ok(sshpk.Key.isKey(pubkey, [1, 1]), 'pubkey must be a sshpk.Key');

	const [keyAlgorithm, hashAlgorithm] = validateAlgorithm(parsedSignature.algorithm, pubkey.type);
	if (keyAlgorithm === 'hmac' || keyAlgorithm !== pubkey.type) return false;

	const verify = pubkey.createVerify(hashAlgorithm);
	verify.update(parsedSignature.signingString);
	return verify.verify(parsedSignature.params.signature, 'base64');
};
