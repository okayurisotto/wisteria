import type { IncomingMessage } from 'node:http';
import type { ParseRequestOption, ParsedSignature } from './types.js';
import { HEADER } from './const.js';
import {
	ExpiredRequestError,
	InvalidAlgorithmError,
	InvalidHeaderError,
	InvalidParamsError,
	InvalidRequestError,
	MissingHeaderError,
	StrictParsingError,
} from './errors.js';
import { validateAlgorithm } from './validateAlgorithm.js';
import { parseSignatureHeaderValue } from './parsers/parseSignatureHeaderValue.js';
import { parseAuthorizationHeaderValue } from './parsers/parseAuthorizationHeaderValue.js';

/**
 * Parses the 'Authorization' header out of an http.IncomingMessage object.
 *
 * Note that this API will fully validate the Authorization header, and throw
 * on any error.  It will not however check the signature, or the keyId format
 * as those are specific to your environment.  You can use the options object
 * to pass in extra constraints.
 *
 * @throws {ExpiredRequestError}
 * @throws {InvalidAlgorithmError}
 * @throws {InvalidHeaderError}
 * @throws {InvalidParamsError}
 * @throws {InvalidRequestError}
 * @throws {MissingHeaderError}
 * @throws {StrictParsingError}
 */
export const parseRequest = (
	request: IncomingMessage,
	options: ParseRequestOption | undefined = {},
): ParsedSignature => {
	const requiredHeaders =
		options.requiredHeaders?.map(v => v.toLowerCase()) ?? [];
	const clockSkew = options.clockSkew ?? 300;

	const method = request.method;
	if (method === undefined) throw new InvalidRequestError();

	const url = request.url;
	if (url === undefined) throw new InvalidRequestError();

	const authHeader = (() => {
		if (options.authorizationHeaderName) {
			return {
				key: options.authorizationHeaderName,
				value: request.headers[options.authorizationHeaderName],
			};
		}

		const auth = request.headers[HEADER.Authorization];
		if (auth !== undefined) {
			return {
				key: HEADER.Authorization,
				value: auth,
			};
		}

		return {
			key: HEADER.Signature,
			value: request.headers[HEADER.Signature],
		};
	})();
	if (authHeader.value === undefined) {
		throw new MissingHeaderError();
	}
	if (Array.isArray(authHeader.value)) {
		throw new InvalidHeaderError();
	}

	const parse =
		authHeader.key === HEADER.Signature
			? parseSignatureHeaderValue
			: parseAuthorizationHeaderValue;
	const parseResult = parse(authHeader.value, 0);

	if (!parseResult.ok || parseResult.offset !== authHeader.value.length) {
		throw new InvalidParamsError();
	}

	const params = new Map(
		parseResult.value.map(({ key, value }) => [key, value]),
	);

	const targetHeaders = (() => {
		const value = params.get('headers');
		if (value === undefined) {
			if (request.headers['x-date']) {
				return ['x-date'];
			} else {
				return ['date'];
			}
		}

		return value.split(' ').map(v => v.toLowerCase());
	})();

	const keyId = params.get('keyId');
	if (keyId === undefined) {
		throw new InvalidHeaderError();
	}

	const algorithm = params.get('algorithm');
	if (algorithm === undefined) {
		throw new InvalidHeaderError();
	}
	if (
		options.algorithm !== undefined &&
		!options.algorithm.includes(algorithm.toLowerCase())
	) {
		throw new InvalidParamsError();
	}
	try {
		validateAlgorithm(algorithm);
	} catch (e) {
		if (e instanceof InvalidAlgorithmError) {
			throw new InvalidParamsError();
		} else {
			throw e;
		}
	}

	const signature = params.get('signature');
	if (signature === undefined) {
		throw new InvalidHeaderError();
	}

	const created = params.get('created');
	if (created) {
		const skew = parseInt(created) - Math.floor(Date.now() / 1000);
		if (skew > clockSkew) {
			throw new ExpiredRequestError();
		}
	}

	const expires = params.get('expires');
	if (expires) {
		const expiredSince = Math.floor(Date.now() / 1000) - parseInt(expires);
		if (expiredSince > clockSkew) {
			throw new ExpiredRequestError();
		}
	}

	const dateValue = request.headers.date;
	if (dateValue && !Array.isArray(dateValue)) {
		const date = new Date(dateValue);
		const now = new Date();
		const skew = Math.abs(now.getTime() - date.getTime());

		if (skew > clockSkew * 1000) {
			throw new ExpiredRequestError();
		}
	}

	if (!requiredHeaders.every(required => targetHeaders.includes(required))) {
		throw new MissingHeaderError();
	}

	const signingString = targetHeaders
		.map((key) => {
			switch (key) {
				// deprecated?
				case 'request-line': {
					if (!options.strict) {
						// We allow headers from the older spec drafts if strict parsing isn't specified in options.
						return method + ' ' + url + ' HTTP/' + request.httpVersion;
					} else {
						// Strict parsing doesn't allow older draft headers.
						throw new StrictParsingError();
					}
				}
				case '(request-target)': {
					return '(request-target): ' + method.toLowerCase() + ' ' + url;
				}
				// ?
				case '(keyid)': {
					return '(keyid): ' + keyId;
				}
				// ?
				case '(algorithm)': {
					return '(algorithm): ' + algorithm;
				}
				// ?
				case '(opaque)': {
					const opaque = params.get('opaque');
					if (opaque !== undefined) {
						return '(opaque): ' + opaque;
					} else {
						throw new MissingHeaderError();
					}
				}
				case '(created)': {
					if (created) {
						return '(created): ' + created;
					} else {
						throw new Error();
					}
				}
				case '(expires)': {
					if (expires) {
						return '(expires): ' + expires;
					} else {
						throw new Error();
					}
				}
				default: {
					const value = request.headers[key];
					if (value === undefined) throw new MissingHeaderError();
					if (Array.isArray(value)) throw new InvalidHeaderError();
					return key + ': ' + value;
				}
			}
		})
		.join('\n');

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
