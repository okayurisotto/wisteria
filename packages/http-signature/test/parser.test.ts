// Copyright 2011 Joyent, Inc.  All rights reserved.

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { test } from 'tap';
import { rfc1123 } from 'jsprim';
import { parseRequest } from '../src/index.js';

/// --- Globals

let socket: string;
let server: http.Server & {
	tester: (req: http.IncomingMessage, res: http.ServerResponse) => void;
};
let options: http.RequestOptions & {
	headers: NonNullable<http.RequestOptions['headers']>;
};

/// --- Tests

void test('setup', function (t) {
	socket = '/tmp/.' + crypto.randomUUID();
	options = {
		socketPath: socket,
		path: '/',
		headers: {},
	};

	server = http.createServer(function (req, res) {
		server.tester(req, res);
	});

	server.listen(socket, function () {
		t.end();
	});
});

void test('no authorization', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}
		res.writeHead(200);
		res.end();
	};

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('bad scheme', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Basic blahBlahBlah';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('no key id', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature foo';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('key id no value', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature keyId=';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('key id no quotes', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId=foo,algorithm=hmac-sha1,signature=aabbcc';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('key id param quotes', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature "keyId"="key"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('param name with space', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature key Id="key"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('no algorithm', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature keyId="foo"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('algorithm no value', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature keyId="foo",algorithm=';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('no signature', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] = 'Signature keyId="foo",algorithm="foo"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid algorithm', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="foo",signature="aaabbbbcccc"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('no date header', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid numeric parameter', function (t) {
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', 'digest'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.fail(e.stack);
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=123456,'
    + 'headers="(created) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid numeric parameter', function (t) {
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', 'digest'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
			res.writeHead(200);
			res.end();
			return;
		}

		t.fail('should throw error');
		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=123@456,'
    + 'headers="(created) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid numeric parameter - decimal', function (t) {
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', 'digest'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
			res.writeHead(200);
			res.end();
			return;
		}

		t.fail('should throw error');
		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=123.456,'
    + 'headers="(created) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid numeric parameter - signed integer', function (t) {
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', 'digest'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
			res.writeHead(200);
			res.end();
			return;
		}

		t.fail('should throw error');
		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=-123456,'
    + 'headers="(created) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('created in future', function (t) {
	const skew = 1000;
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', 'digest'],
			clockSkew: skew,
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
			res.writeHead(200);
			res.end();
			return;
		}

		t.fail('should throw error');
		res.writeHead(200);
		res.end();
	};

	const created = Math.floor(Date.now() / 1000) + skew + 10;
	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=' + created.toString() + ','
    + 'headers="(created) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('expires expired', function (t) {
	const skew = 1000;
	server.tester = function (req, res) {
		const options = {
			headers: ['(expires)', 'digest'],
			clockSkew: skew,
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
			res.writeHead(200);
			res.end();
			return;
		}

		t.fail('should throw error');
		res.writeHead(200);
		res.end();
	};

	const expires = Math.floor(Date.now() / 1000) - skew - 1;
	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'expires=' + expires.toString() + ','
    + 'headers="(expires) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid created and expires with skew', function (t) {
	const skew = 1000;
	server.tester = function (req, res) {
		const options = {
			headers: ['(created)', '(expires)', 'digest'],
			clockSkew: skew,
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.fail(e.stack);
		}

		res.writeHead(200);
		res.end();
	};

	// created is in the future but within allowed skew
	const created = Math.floor(Date.now() / 1000) + skew - 1;
	// expires is in the past but within allowed skew
	const expires = Math.floor(Date.now() / 1000) - skew + 10;
	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'created=' + created.toString() + ',' + 'expires=' + expires.toString() + ','
    + 'headers="(created) (expires) dIgEsT",signature="digitalSignature"';
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid default headers', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.fail(e.stack);
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
	options.headers['Date'] = rfc1123(new Date());
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid custom authorizationHeaderName', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req, { authorizationHeaderName: 'x-auth' });
		} catch (e) {
			t.fail(e.stack);
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['x-auth'] =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
	options.headers['Date'] = rfc1123(new Date());
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('explicit headers missing', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="rsa-sha256",'
    + 'headers="date digest",signature="aaabbbbcccc"';
	options.headers['Date'] = rfc1123(new Date());
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid explicit headers request-line', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="fo,o",algorithm="RSA-sha256",'
    + 'headers="dAtE dIgEsT request-line",'
    + 'extensions="blah blah",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['digest'] = crypto.randomUUID();

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);

		let body = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			body += chunk;
		});

		res.on('end', function () {
			console.log(body);
			const parsed: unknown = JSON.parse(body);
			t.ok(parsed);
			t.equal(parsed.scheme, 'Signature');
			t.ok(parsed.params);
			t.equal(parsed.params.keyId, 'fo,o');
			t.equal(parsed.params.algorithm, 'rsa-sha256');
			t.equal(parsed.params.extensions, 'blah blah');
			t.ok(parsed.params.headers);
			t.equal(parsed.params.headers.length, 3);
			t.equal(parsed.params.headers[0], 'date');
			t.equal(parsed.params.headers[1], 'digest');
			t.equal(parsed.params.headers[2], 'request-line');
			t.equal(parsed.params.signature, 'digitalSignature');
			t.ok(parsed.signingString);
			t.equal(parsed.signingString,
				('date: ' + options.headers['Date'] + '\n'
				+ 'digest: ' + options.headers['digest'] + '\n'
				+ 'GET / HTTP/1.1'));
			t.equal(parsed.params.keyId, parsed.keyId);
			t.equal(parsed.params.algorithm.toUpperCase(),
				parsed.algorithm);
			t.end();
		});
	});
});

void test('valid explicit headers request-line strict true', function (t) {
	server.tester = function (req, res) {
		try {
			parseRequest(req, { strict: true });
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="fo,o",algorithm="RSA-sha256",'
    + 'headers="dAtE dIgEsT request-line",'
    + 'extensions="blah blah",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['digest'] = crypto.randomUUID();

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid explicit headers request-target', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="fo,o",algorithm="RSA-sha256",'
    + 'headers="dAtE dIgEsT (request-target)",'
    + 'extensions="blah blah",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['digest'] = crypto.randomUUID();

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);

		let body = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			body += chunk;
		});

		res.on('end', function () {
			console.log(body);
			const parsed: unknown = JSON.parse(body);
			t.ok(parsed);
			t.equal(parsed.scheme, 'Signature');
			t.ok(parsed.params);
			t.equal(parsed.params.keyId, 'fo,o');
			t.equal(parsed.params.algorithm, 'rsa-sha256');
			t.equal(parsed.params.extensions, 'blah blah');
			t.ok(parsed.params.headers);
			t.equal(parsed.params.headers.length, 3);
			t.equal(parsed.params.headers[0], 'date');
			t.equal(parsed.params.headers[1], 'digest');
			t.equal(parsed.params.headers[2], '(request-target)');
			t.equal(parsed.params.signature, 'digitalSignature');
			t.ok(parsed.signingString);
			t.equal(parsed.signingString,
				('date: ' + options.headers['Date'] + '\n'
				+ 'digest: ' + options.headers['digest'] + '\n'
				+ '(request-target): get /'));
			t.equal(parsed.params.keyId, parsed.keyId);
			t.equal(parsed.params.algorithm.toUpperCase(),
				parsed.algorithm);
			t.end();
		});
	});
});

void test('expired', function (t) {
	server.tester = function (req, res) {
		const options = {
			clockSkew: 1,
			headers: ['date'],
		};

		setTimeout(function () {
			try {
				parseRequest(req);
			} catch (e) {
				t.pass();
			}

			res.writeHead(200);
			res.end();
		}, 1200);
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'headers="dAtE dIgEsT",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('missing required header', function (t) {
	server.tester = function (req, res) {
		const options = {
			clockSkew: 1,
			headers: ['date', 'x-unit-test'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.pass();
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['content-md5'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid mixed case headers', function (t) {
	server.tester = function (req, res) {
		const options = {
			clockSkew: 1,
			headers: ['Date', 'Content-MD5'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.fail(e.stack);
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['content-md5'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('not whitelisted algorithm', function (t) {
	server.tester = function (req, res) {
		const options = {
			clockSkew: 1,
			algorithms: ['rsa-sha1'],
		};

		try {
			parseRequest(req, options);
		} catch (e) {
			t.equal('InvalidParamsError', e.name);
			t.equal('rsa-sha256 is not a supported algorithm', e.message);
		}

		res.writeHead(200);
		res.end();
	};

	options.headers['Authorization'] =
    'Signature keyId="f,oo",algorithm="RSA-sha256",'
    + 'headers="dAtE dIgEsT",signature="digitalSignature"';
	options.headers['Date'] = rfc1123(new Date());
	options.headers['digest'] = crypto.randomUUID();
	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('tearDown', function (t) {
	server.on('close', function () {
		t.end();
	});
	server.close();
});
