/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as crypto from 'node:crypto';
import * as util from 'node:util';

const generateKeyPair = util.promisify(crypto.generateKeyPair);

export async function genRsaKeyPair(modulusLength = 2048) {
	return await generateKeyPair('rsa', {
		modulusLength,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem',
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined,
		},
	});
}
