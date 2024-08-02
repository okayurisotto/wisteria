// Copyright 2015 Joyent, Inc.

import parser from './parser.js';
import signer from './signer.js';
import verify_ from './verify.js';
import utils from './utils.js';



///--- API

export default {
	parse: parser.parseRequest,
	parseRequest: parser.parseRequest,

	sign: signer.signRequest,
	signRequest: signer.signRequest,
	createSigner: signer.createSigner,
	isSigner: signer.isSigner,

	sshKeyToPEM: utils.sshKeyToPEM,
	sshKeyFingerprint: utils.fingerprint,
	pemToRsaSSHKey: utils.pemToRsaSSHKey,

	verify: verify_.verifySignature,
	verifySignature: verify_.verifySignature,
	verifyHMAC: verify_.verifyHMAC,
};

export const parse = parser.parseRequest;
export const parseRequest = parser.parseRequest;

export const sign = signer.signRequest;
export const signRequest = signer.signRequest;
export const createSigner = signer.createSigner;
export const isSigner = signer.isSigner;

export const sshKeyToPEM = utils.sshKeyToPEM;
export const sshKeyFingerprint = utils.fingerprint;
export const pemToRsaSSHKey = utils.pemToRsaSSHKey;

export const verify = verify_.verifySignature;
export const verifySignature = verify_.verifySignature;
export const verifyHMAC = verify_.verifyHMAC;
