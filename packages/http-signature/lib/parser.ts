// Copyright 2012 Joyent, Inc.  All rights reserved.

import type { IncomingMessage } from 'node:http';
import { HEADER, HttpSignatureError, InvalidAlgorithmError, validateAlgorithm } from './utils.js';
import { map, or, pattern, pipe, separated, type Parser } from 'parcom';

// #region errors

export class ExpiredRequestError extends HttpSignatureError {
	constructor(message: string) {
		super(message, ExpiredRequestError);
	}
}

export class InvalidHeaderError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidHeaderError);
	}
}

export class InvalidParamsError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidParamsError);
	}
}

export class MissingHeaderError extends HttpSignatureError {
	constructor(message: string) {
		super(message, MissingHeaderError);
	}
}

export class StrictParsingError extends HttpSignatureError {
	constructor(message: string) {
		super(message, StrictParsingError);
	}
}

// #endregion

export type ParseRequestOption = {
	algorithm?: string;
	authorizationHeaderName?: string;
	clockSkew?: number;
	headers?: string[];
	strict?: boolean;
};

export interface ParsedSignature {
	algorithm: string;
	keyId: string;
	opaque: string | undefined;
	scheme: string;
	signingString: string;
	params: {
		algorithm: string;
		headers: string[];
		keyId: string;
		signature: string;
	};
}

/**
 * Parses the 'Authorization' header out of an http.ServerRequest object.
 *
 * Note that this API will fully validate the Authorization header, and throw
 * on any error.  It will not however check the signature, or the keyId format
 * as those are specific to your environment.  You can use the options object
 * to pass in extra constraints.
 *
 * As a response object you can expect this:
 *
 * ```
 * {
 *   "scheme": "Signature",
 *   "params": {
 *     "keyId": "foo",
 *     "algorithm": "rsa-sha256",
 *     "headers": [
 *       "date" or "x-date",
 *       "digest"
 *     ],
 *     "signature": "base64"
 *   },
 *   "signingString": "ready to be passed to crypto.verify()"
 * }
 * ```
 *
 * @param request an http.ServerRequest.
 * @param options an optional options object with:
 *                   - clockSkew: allowed clock skew in seconds (default 300).
 *                   - headers: required header names (def: date or x-date)
 *                   - algorithms: algorithms to support (default: all).
 *                   - strict: should enforce latest spec parsing (default: false).
 * @return parsed out object (see above).
 *
 * @throws {TypeError} on invalid input.
 * @throws {InvalidHeaderError} on an invalid Authorization header error.
 * @throws {InvalidParamsError} if the params in the scheme are invalid.
 * @throws {MissingHeaderError} if the params indicate a header not present,
 *                              either in the request headers from the params,
 *                              or not in the params from a required header in options.
 * @throws {StrictParsingError} if old attributes are used in strict parsing mode.
 * @throws {ExpiredRequestError} if the value of date or x-date exceeds skew.
 */
export const parseRequest = (
	request: IncomingMessage,
	options: ParseRequestOption | undefined = {},
): ParsedSignature => {
	const method = request.method;
	if (method === undefined) throw new Error();

	const url = request.url;
	if (url === undefined) throw new Error();

	const requiredHeaders = options.headers ?? [request.headers['x-date'] ? 'x-date' : 'date'];
	const clockSkew = options.clockSkew ?? 300;

	const header = (() => {
		if (options.authorizationHeaderName) {
			return {
				key: options.authorizationHeaderName,
				value: request.headers[options.authorizationHeaderName],
			};
		}

		const auth = request.headers[HEADER.AUTH];
		if (auth !== undefined) {
			return {
				key: HEADER.AUTH,
				value: auth,
			};
		}

		return {
			key: HEADER.SIG,
			value: request.headers[HEADER.SIG],
		};
	})();

	if (!header.value) throw new MissingHeaderError('no header present in the request');
	if (Array.isArray(header.value)) throw new InvalidHeaderError('');

	const parse = header.key === HEADER.SIG
		? parseSignatureHeaderValue
		: parseAuthorizationHeaderValue;
	const parseResult = parse(header.value, 0);

	if (!parseResult.ok || parseResult.offset !== header.value.length) {
		throw new InvalidParamsError('');
	}

	const params = new Map(parseResult.value.map(({ key, value }) => [key, value]));

	const targetHeaders: string[] = (() => {
		const value = params.get('headers');

		if (value === undefined || value === '') {
			if (request.headers['x-date']) {
				return ['x-date'];
			} else {
				return ['date'];
			}
		} else {
			return value.split(' ');
		}
	})().map(v => v.toLowerCase());

	const keyId = params.get('keyId');
	if (keyId === undefined) throw new InvalidHeaderError('keyId was not specified');

	const algorithm = params.get('algorithm');
	if (algorithm === undefined) throw new InvalidHeaderError('algorithm was not specified');

	const signature = params.get('signature');
	if (signature === undefined) throw new InvalidHeaderError('signature was not specified');

	const created = params.get('created');
	const expires = params.get('expires');

	// Check the algorithm against the official list
	try {
		validateAlgorithm(algorithm);
	} catch (e) {
		if (e instanceof InvalidAlgorithmError) {
			throw new InvalidParamsError(algorithm + ' is not supported');
		} else {
			throw e;
		}
	}

	// #region Build the signingString

	const signingStrings: string[] = [];

	for (const key of targetHeaders) {
		if (key === 'request-line') {
			if (!options.strict) {
				/** We allow headers from the older spec drafts if strict parsing isn't specified in options. */
				signingStrings.push(method + ' ' + url + ' HTTP/' + request.httpVersion);
			} else {
				/* Strict parsing doesn't allow older draft headers. */
				throw new StrictParsingError('request-line is not a valid header with strict parsing enabled.');
			}
		} else if (key === '(request-target)') {
			signingStrings.push('(request-target): ' + method.toLowerCase() + ' ' + url);
		} else if (key === '(keyid)') {
			signingStrings.push('(keyid): ' + keyId);
		} else if (key === '(algorithm)') {
			signingStrings.push('(algorithm): ' + algorithm);
		} else if (key === '(opaque)') {
			const opaque = params.get('opaque');
			if (opaque === undefined) throw new MissingHeaderError('');
			signingStrings.push('(opaque): ' + opaque);
		} else if (key === '(created)') {
			if (created) {
				signingStrings.push('(created): ' + created);
			} else {
				throw new Error();
			}
		} else if (key === '(expires)') {
			if (expires) {
				signingStrings.push('(expires): ' + expires);
			} else {
				throw new Error();
			}
		} else {
			const value = request.headers[key];
			if (value === undefined) throw new MissingHeaderError(key + ' was not in the request');
			if (Array.isArray(value)) throw new InvalidHeaderError('');
			signingStrings.push(key + ': ' + value);
		}
	}

	const signingString = signingStrings.join('\n');

	// #endregion

	// #region Check against the constraints

	const newLocal = request.headers['x-date'] ?? request.headers.date;
	if (newLocal && !Array.isArray(newLocal)) {
		const date = new Date(newLocal);
		const now = new Date();
		const skew = Math.abs(now.getTime() - date.getTime());

		if (skew > clockSkew * 1000) {
			throw new ExpiredRequestError(`clock skew of ${(skew / 1000)}s was greater than ${clockSkew}s`);
		}
	}

	if (created) {
		const skew = parseInt(created) - Math.floor(Date.now() / 1000);
		if (skew > clockSkew) {
			throw new ExpiredRequestError(`Created lies in the future (with skew ${skew}s greater than allowed ${clockSkew}s`);
		}
	}

	if (expires) {
		const expiredSince = Math.floor(Date.now() / 1000) - parseInt(expires);
		if (expiredSince > clockSkew) {
			throw new ExpiredRequestError(`Request expired with skew ${expiredSince}s greater than allowed ${clockSkew}s`);
		}
	}

	for (const requiredHeader of requiredHeaders) {
		// Remember that we already checked any headers in the params were in the request, so if this passes we're good.
		if (!targetHeaders.includes(requiredHeader.toLowerCase())) {
			throw new MissingHeaderError(requiredHeader + ' was not a signed header');
		}
	}

	if (options.algorithm !== undefined && !options.algorithm.includes(algorithm.toLowerCase())) {
		throw new InvalidParamsError('unsupported algorithm');
	}

	// #endregion

	return {
		scheme: 'Signature',
		algorithm: algorithm.toUpperCase(),
		keyId: keyId,
		opaque: params.get('opaque'),
		signingString,
		params: {
			...Object.fromEntries(params),
			algorithm: algorithm.toLowerCase(),
			headers: targetHeaders,
			keyId,
			signature,
		},
	};
};

const parseAuthorizationHeaderValue: Parser<{ key: string; value: string }[]> = (value, offset) => {
	return map(
		pipe([pattern(/^Signature /), parseSignatureHeaderValue]),
		([, v]) => v,
	)(value, offset);
};

const parseSignatureHeaderValue: Parser<{ key: string; value: string }[]> = (value, offset) => {
	const parameter = map(
		or([
			pattern(/^([A-Za-z]+)="([^"]+)"/),
			pattern(/^([A-Za-z]+)=(\d+)/),
		]),
		([, key, value]) => {
			if (key === undefined) throw new Error();
			if (value === undefined) throw new Error();
			return { key, value };
		},
	);
	const separator = pattern(/^,/);
	const parameters = separated(parameter, separator);

	return parameters(value, offset);
};
