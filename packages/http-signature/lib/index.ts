// Copyright 2015 Joyent, Inc.

import { parseRequest as parseRequest_ } from './parser.js';
import { isSigner as isSigner_, createSigner as createSigner_, signRequest as signRequest_ } from './signer.js';
import { verifySignature as verifySignature_, verifyHMAC as verifyHMAC_ } from './verify.js';
import { sshKeyToPEM as sshKeyToPEM_, fingerprint as sshKeyFingerprint_, pemToRsaSSHKey as pemToRsaSSHKey_ } from './utils.js';



///--- API

export default {
	parse: parseRequest_,
	parseRequest: parseRequest_,

	sign: signRequest_,
	signRequest: signRequest_,
	createSigner: createSigner_,
	isSigner: isSigner_,

	sshKeyToPEM: sshKeyToPEM_,
	sshKeyFingerprint: sshKeyFingerprint_,
	pemToRsaSSHKey: pemToRsaSSHKey_,

	verify: verifySignature_,
	verifySignature: verifySignature_,
	verifyHMAC: verifyHMAC_,
};

export const parse = parseRequest_;
export const parseRequest = parseRequest_;

export const sign = signRequest_;
export const signRequest = signRequest_;
export const createSigner = createSigner_;
export const isSigner = isSigner_;

export const sshKeyToPEM = sshKeyToPEM_;
export const sshKeyFingerprint = sshKeyFingerprint_;
export const pemToRsaSSHKey = pemToRsaSSHKey_;

export const verify = verifySignature_;
export const verifySignature = verifySignature_;
export const verifyHMAC = verifyHMAC_;
