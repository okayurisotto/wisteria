import type { IncomingMessage } from 'node:http';
import { map, or, pattern, pipe, separated, type Parser } from 'parcom';
import type { ParseRequestOption, ParsedSignature } from './types.js';
import { HEADER } from './const.js';
import {
	ExpiredRequestError,
	InvalidAlgorithmError,
	InvalidHeaderError,
	InvalidParamsError,
	MissingHeaderError,
	StrictParsingError,
} from './errors.js';
import { validateAlgorithm } from './validateAlgorithm.js';

/**
 * Parses the 'Authorization' header out of an http.IncomingMessage object.
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
 *     "headers": ["date", "digest"],
 *     "signature": "base64"
 *   },
 *   "signingString": "ready to be passed to crypto.verify()"
 * }
 * ```
 *
 * @throws {InvalidHeaderError} on an invalid Authorization header error.
 * @throws {InvalidParamsError} if the params in the scheme are invalid.
 * @throws {MissingHeaderError} if the params indicate a header not present,
 *                              either in the request headers from the params,
 *                              or not in the params from a required header in options.
 * @throws {StrictParsingError} if old attributes are used in strict parsing mode.
 * @throws {ExpiredRequestError} if the value of date exceeds skew.
 */
export const parseRequest = (
	request: IncomingMessage,
	options: ParseRequestOption | undefined = {},
): ParsedSignature => {
	const requiredHeaders = options.requiredHeaders ?? [];
	const clockSkew = options.clockSkew ?? 300;

	const method = request.method;
	if (method === undefined) throw new Error();

	const url = request.url;
	if (url === undefined) throw new Error();

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
		throw new MissingHeaderError('no header present in the request');
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
		throw new InvalidHeaderError('keyId was not specified');
	}

	const algorithm = params.get('algorithm');
	if (algorithm === undefined) {
		throw new InvalidHeaderError('algorithm was not specified');
	}
	if (
		options.algorithm !== undefined &&
		!options.algorithm.includes(algorithm.toLowerCase())
	) {
		throw new InvalidParamsError('unsupported algorithm');
	}
	try {
		validateAlgorithm(algorithm);
	} catch (e) {
		if (e instanceof InvalidAlgorithmError) {
			throw new InvalidParamsError(algorithm + ' is not supported');
		} else {
			throw e;
		}
	}

	const signature = params.get('signature');
	if (signature === undefined) {
		throw new InvalidHeaderError('signature was not specified');
	}

	const created = params.get('created');
	if (created) {
		const skew = parseInt(created) - Math.floor(Date.now() / 1000);
		if (skew > clockSkew) {
			throw new ExpiredRequestError(
				`Created lies in the future (with skew ${skew}s greater than allowed ${clockSkew}s`,
			);
		}
	}

	const expires = params.get('expires');
	if (expires) {
		const expiredSince = Math.floor(Date.now() / 1000) - parseInt(expires);
		if (expiredSince > clockSkew) {
			throw new ExpiredRequestError(
				`Request expired with skew ${expiredSince}s greater than allowed ${clockSkew}s`,
			);
		}
	}

	const dateValue = request.headers.date;
	if (dateValue && !Array.isArray(dateValue)) {
		const date = new Date(dateValue);
		const now = new Date();
		const skew = Math.abs(now.getTime() - date.getTime());

		if (skew > clockSkew * 1000) {
			throw new ExpiredRequestError(
				`clock skew of ${skew / 1000}s was greater than ${clockSkew}s`,
			);
		}
	}

	for (const requiredHeader of requiredHeaders) {
		if (!targetHeaders.includes(requiredHeader.toLowerCase())) {
			throw new MissingHeaderError(requiredHeader + ' was not a signed header');
		}
	}

	// #region Build the signingString

	const signingStrings: string[] = [];

	for (const key of targetHeaders) {
		if (key === 'request-line') {
			if (!options.strict) {
				/** We allow headers from the older spec drafts if strict parsing isn't specified in options. */
				signingStrings.push(
					method + ' ' + url + ' HTTP/' + request.httpVersion,
				);
			} else {
				/* Strict parsing doesn't allow older draft headers. */
				throw new StrictParsingError(
					'request-line is not a valid header with strict parsing enabled.',
				);
			}
		} else if (key === '(request-target)') {
			signingStrings.push(
				'(request-target): ' + method.toLowerCase() + ' ' + url,
			);
		} else if (key === '(keyid)') {
			signingStrings.push('(keyid): ' + keyId);
		} else if (key === '(algorithm)') {
			signingStrings.push('(algorithm): ' + algorithm);
		} else if (key === '(opaque)') {
			const opaque = params.get('opaque');
			if (opaque === undefined) throw new MissingHeaderError();
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
			if (value === undefined)
				throw new MissingHeaderError(key + ' was not in the request');
			if (Array.isArray(value)) throw new InvalidHeaderError();
			signingStrings.push(key + ': ' + value);
		}
	}

	const signingString = signingStrings.join('\n');

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

const parseAuthorizationHeaderValue: Parser<
	{ key: string; value: string }[]
> = (value, offset) => {
	return map(
		pipe([pattern(/^Signature /), parseSignatureHeaderValue]),
		([, v]) => v,
	)(value, offset);
};

const parseSignatureHeaderValue: Parser<{ key: string; value: string }[]> = (
	value,
	offset,
) => {
	const parameter = map(
		or([pattern(/^([A-Za-z]+)="([^"]+)"/), pattern(/^([A-Za-z]+)=(\d+)/)]),
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
