// Copyright 2012 Joyent, Inc.  All rights reserved.

import assert from 'assert-plus';
import sshpk from 'sshpk';

export var HASH_ALGOS = {
  'sha1': true,
  'sha256': true,
  'sha512': true
};

export var PK_ALGOS = {
  'rsa': true,
  'dsa': true,
  'ecdsa': true,
  'ed25519': true
};

export var HEADER = {
  AUTH: 'authorization',
  SIG: 'signature'
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
 * @param algorithm {String} the algorithm of the signature
 * @param publicKeyType {String?} fallback algorithm (public key type) for
 *                                hs2019
 * @returns {[string, string]}
 */
export function validateAlgorithm(algorithm, publicKeyType) {
  assert.string(algorithm, 'algorithm');
  assert.optionalString(publicKeyType, 'publicKeyType');

  var alg = algorithm.toLowerCase().split('-');

  if (alg[0] === 'hs2019') {
    if (publicKeyType === 'ed25519') {
      return validateAlgorithm('ed25519-sha512')
    } else if (publicKeyType !== undefined) {
      return validateAlgorithm(publicKeyType + '-sha256')
    }

    return  ['hs2019', 'sha256'];
  }

  if (alg.length !== 2) {
    throw (new InvalidAlgorithmError(alg[0].toUpperCase() + ' is not a ' +
      'valid algorithm'));
  }

  if (alg[0] !== 'hmac' && !PK_ALGOS[alg[0]]) {
    throw (new InvalidAlgorithmError(alg[0].toUpperCase() + ' type keys ' +
      'are not supported'));
  }

  if (!HASH_ALGOS[alg[1]]) {
    throw (new InvalidAlgorithmError(alg[1].toUpperCase() + ' is not a ' +
      'supported hash algorithm'));
  }

  return (alg);
}

/**
 * Converts an OpenSSH public key (rsa only) to a PKCS#8 PEM file.
 *
 * The intent of this module is to interoperate with OpenSSL only,
 * specifically the node crypto module's `verify` method.
 *
 * @param {String} key an OpenSSH public key.
 * @return {String} PEM encoded form of the RSA public key.
 * @throws {TypeError} on bad input.
 * @throws {Error} on invalid ssh key formatted data.
 */
export function sshKeyToPEM(key) {
	assert.string(key, 'ssh_key');

	var k = sshpk.parseKey(key, 'ssh');
	return (k.toString('pem'));
}

/**
 * Generates an OpenSSH fingerprint from an ssh public key.
 *
 * @param {String} key an OpenSSH public key.
 * @return {String} key fingerprint.
 * @throws {TypeError} on bad input.
 * @throws {Error} if what you passed doesn't look like an ssh public key.
 */
export function fingerprint(key) {
	assert.string(key, 'ssh_key');

	var k = sshpk.parseKey(key, 'ssh');
	return (k.fingerprint('md5').toString('hex'));
};

/**
 * Converts a PKGCS#8 PEM file to an OpenSSH public key (rsa)
 *
 * The reverse of the above function.
 */
export function pemToRsaSSHKey(pem, comment) {
	assert.equal('string', typeof (pem), 'typeof pem');

	var k = sshpk.parseKey(pem, 'pem');
	k.comment = comment;
	return (k.toString('ssh'));
}
