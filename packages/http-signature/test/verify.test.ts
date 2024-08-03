// Copyright 2011 Joyent, Inc.  All rights reserved.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import { rfc1123 } from 'jsprim';
import sshpk from 'sshpk';
import { test } from 'tap';
import { parseRequest, verifySignature } from '../lib/index.js';

/// --- Globals

let rsaPrivate: string;
let rsaPublic: string;
let dsaPrivate: string;
let dsaPublic: string;
let ecdsaPrivate: string;
let ecdsaPublic: string;
let ed25519Private: string;
let ed25519Public: string;

let socket: string;
let server: http.Server & {
	tester: (req: http.IncomingMessage, res: http.ServerResponse) => void;
};
let options: http.RequestOptions & {
	headers: NonNullable<http.RequestOptions['headers']>;
};

/// --- Tests

void test('setup', function (t) {
	rsaPrivate = fs.readFileSync(import.meta.dirname + '/rsa_private.pem', 'ascii');
	dsaPrivate = fs.readFileSync(import.meta.dirname + '/dsa_private.pem', 'ascii');
	ecdsaPrivate = fs.readFileSync(import.meta.dirname + '/ecdsa_private.pem', 'ascii');

	{
		const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
			publicKeyEncoding: {
				type: 'spki',
				format: 'pem',
			},
			privateKeyEncoding: {
				type: 'pkcs8',
				format: 'pem',
			},
		});

		ed25519Private = privateKey;
		ed25519Public = publicKey;
	}

	t.ok(rsaPrivate);
	t.ok(dsaPrivate);
	t.ok(ecdsaPrivate);
	t.ok(ed25519Private);

	rsaPublic = fs.readFileSync(import.meta.dirname + '/rsa_public.pem', 'ascii');
	dsaPublic = fs.readFileSync(import.meta.dirname + '/dsa_public.pem', 'ascii');
	ecdsaPublic = fs.readFileSync(import.meta.dirname + '/ecdsa_public.pem', 'ascii');
	t.ok(rsaPublic);
	t.ok(dsaPublic);
	t.ok(ecdsaPublic);
	t.ok(ed25519Public);

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

void test('invalid rsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, rsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="rsa-sha1",signature="'
    + crypto.randomUUID() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid rsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, rsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const signer = crypto.createSign('RSA-SHA256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="'
    + signer.sign(rsaPrivate, 'base64') + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid dsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, dsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="dsa-sha1",signature="'
    + crypto.randomUUID() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid dsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, dsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(dsaPrivate);
	const signer = key.createSign('sha256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="dsa-sha256",signature="'
    + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid ecdsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, ecdsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="ecdsa-sha256",signature="'
    + crypto.randomUUID() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid ecdsa', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, ecdsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(ecdsaPrivate);
	const signer = key.createSign('sha512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="ecdsa-sha512",signature="'
    + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid ed25519', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, ed25519Public));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="ed25519-sha512",signature="'
    + 'a'.repeat(86) + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('valid ed25519', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, ed25519Public));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(ed25519Private);
	const signer = key.createSign('sha512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="foo",algorithm="ed25519-sha512",signature="'
    + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid hs2019', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, ecdsaPublic));

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + crypto.randomUUID() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now valid hs2019 (valid ecdsa-sha256)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, ecdsaPublic), 'hs2019 ecdsa-sha256');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(ecdsaPrivate);
	const signer = key.createSign('sha256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now invalid hs2019 (valid ecdsa-sha512)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, ecdsaPublic), 'hs2019 ecdsa-sha512');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(ecdsaPrivate);
	const signer = key.createSign('sha512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now invalid hs2019 (valid ed25519-sha512)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, ed25519Public), 'hs2019 ed25519-sha512');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(ed25519Private);
	const signer = key.createSign('sha512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now invalid hs2019 (valid dsa-sha512)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, dsaPublic), 'hs2019 dsa-sha512');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const key = sshpk.parsePrivateKey(dsaPrivate);
	const signer = key.createSign('sha512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign().toString() + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now valid hs2019 (valid rsa-sha256)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(verifySignature(parsed, rsaPublic), 'hs2019 rsa-sha256');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const signer = crypto.createSign('RSA-SHA256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign(rsaPrivate, 'base64') + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('for now invalid hs2019 (valid rsa-sha512)', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req);
		t.ok(!verifySignature(parsed, rsaPublic), 'hs2019 rsa-sha512');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.headers['Date'] = rfc1123(new Date());
	const signer = crypto.createSign('RSA-SHA512');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
      'Signature keyId="foo",algorithm="hs2019",signature="'
      + signer.sign(rsaPrivate, 'base64') + '"';

	http.get(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
});

void test('invalid date', function (t) {
	server.tester = function (req, res) {
		t.throws(function () {
			parseRequest(req);
		});

		res.writeHead(400);
		res.end();
	};

	options.method = 'POST';
	options.path = '/';
	options.headers.host = 'example.com';
	// very old, out of valid date range
	// very old, out of valid date range
	options.headers['Date'] = 'Sat, 01 Jan 2000 00:00:00 GMT';
	const signer = crypto.createSign('RSA-SHA256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="Test",algorithm="rsa-sha256",signature="'
    + signer.sign(rsaPrivate, 'base64') + '"';

	const req = http.request(options, function (res) {
		t.equal(res.statusCode, 400);
		t.end();
	});
	req.end();
});

// test values from spec for simple test
void test('valid rsa from spec default', function (t) {
	server.tester = function (req, res) {
		const parsed = parseRequest(req, {
			// this test uses a fixed old date so ignore clock skew
			clockSkew: Number.MAX_VALUE,
		});
		t.ok(verifySignature(parsed, rsaPublic));
		// check known signature
		t.ok(req.headers.authorization === 'Signature keyId="Test",algorithm="rsa-sha256",signature="ATp0r26dbMIxOopqw0OfABDT7CKMIoENumuruOtarj8n/97Q3htHFYpH8yOSQk3Z5zh8UxUym6FYTb5+A0Nz3NRsXJibnYi7brE/4tx5But9kkFGzG+xpUmimN4c3TMN7OFH//+r8hBf7BT9/GmHDUVZT2JzWGLZES2xDOUuMtA="');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.method = 'POST';
	options.path = '/';
	options.headers.host = 'example.com';
	// date from spec examples
	// date from spec examples
	options.headers['Date'] = 'Thu, 05 Jan 2012 21:31:40 GMT';
	const signer = crypto.createSign('RSA-SHA256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="Test",algorithm="rsa-sha256",signature="'
    + signer.sign(rsaPrivate, 'base64') + '"';

	const req = http.request(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
	req.end();
});

// test values from spec for defaults
void test('valid rsa from spec default', function (t) {
	const jsonMessage = '{"hello": "world"}';
	const sha256sum = crypto.createHash('sha256');
	sha256sum.update(jsonMessage);

	server.tester = function (req, res) {
		const parsed = parseRequest(req, {
			// this test uses a fixed old date so ignore clock skew
			clockSkew: Number.MAX_VALUE,
		});
		t.ok(verifySignature(parsed, rsaPublic));
		// check known signature
		t.ok(req.headers.authorization === 'Signature keyId="Test",algorithm="rsa-sha256",signature="jKyvPcxB4JbmYY4mByyBY7cZfNl4OW9HpFQlG7N4YcJPteKTu4MWCLyk+gIr0wDgqtLWf9NLpMAMimdfsH7FSWGfbMFSrsVTHNTk0rK3usrfFnti1dxsM4jl0kYJCKTGI/UWkqiaxwNiKqGcdlEDrTcUhhsFsOIo8VhddmZTZ8w="');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.method = 'POST';
	options.path = '/foo?param=value&pet=dog';
	options.headers.host = 'example.com';
	options.headers['Date'] = 'Thu, 05 Jan 2014 21:31:40 GMT';
	options.headers['content-type'] = 'application/json';
	options.headers['digest'] = 'SHA-256=' + sha256sum.digest('base64');
	options.headers['content-length'] = (jsonMessage.length - 1).toString();
	const signer = crypto.createSign('RSA-SHA256');
	signer.update('date: ' + options.headers['Date']);
	options.headers['Authorization'] =
    'Signature keyId="Test",algorithm="rsa-sha256",signature="'
    + signer.sign(rsaPrivate, 'base64') + '"';

	const req = http.request(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
	req.write(jsonMessage);
	req.end();
});

// test values from spec for all headers
void test('valid rsa from spec all headers', function (t) {
	const jsonMessage = '{"hello": "world"}';
	const sha256sum = crypto.createHash('sha256');
	sha256sum.update(jsonMessage);

	server.tester = function (req, res) {
		const parsed = parseRequest(req, {
			// this test uses a fixed old date so ignore clock skew
			clockSkew: Number.MAX_VALUE,
		});
		t.ok(verifySignature(parsed, rsaPublic));
		// check known signature
		t.ok(req.headers.authorization === 'Signature keyId="Test",algorithm="rsa-sha256",headers="request-line host date content-type digest content-length",signature="jgSqYK0yKclIHfF9zdApVEbDp5eqj8C4i4X76pE+XHoxugXv7qnVrGR+30bmBgtpR39I4utq17s9ghz/2QFVxlnToYAvbSVZJ9ulLd1HQBugO0jOyn9sXOtcN7uNHBjqNCqUsnt0sw/cJA6B6nJZpyNqNyAXKdxZZItOuhIs78w="');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.method = 'POST';
	options.path = '/foo?param=value&pet=dog';
	options.headers.host = 'example.com';
	options.headers['Date'] = 'Thu, 05 Jan 2014 21:31:40 GMT';
	options.headers['content-type'] = 'application/json';
	options.headers['digest'] = 'SHA-256=' + sha256sum.digest('base64');
	options.headers['content-length'] = (jsonMessage.length - 1).toString();
	const signer = crypto.createSign('RSA-SHA256');
	signer.update(options.method + ' ' + options.path + ' HTTP/1.1\n');
	signer.update('host: ' + options.headers.host + '\n');
	signer.update('date: ' + options.headers['Date'] + '\n');
	signer.update('content-type: ' + options.headers['content-type'] + '\n');
	signer.update('digest: ' + options.headers['digest'] + '\n');
	signer.update('content-length: ' + options.headers['content-length']);
	options.headers['Authorization'] =
    'Signature keyId="Test",algorithm="rsa-sha256",headers='
    + '"request-line host date content-type digest content-length"'
    + ',signature="' + signer.sign(rsaPrivate, 'base64') + '"';

	const req = http.request(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
	req.write(jsonMessage);
	req.end();
});

void test('valid rsa from spec all headers (request-target)', function (t) {
	const jsonMessage = '{"hello": "world"}';
	const sha256sum = crypto.createHash('sha256');
	sha256sum.update(jsonMessage);

	server.tester = function (req, res) {
		const parsed = parseRequest(req, {
			// this test uses a fixed old date so ignore clock skew
			clockSkew: Number.MAX_VALUE,
		});
		t.ok(verifySignature(parsed, rsaPublic));
		// check known signature
		t.ok(req.headers.authorization === 'Signature keyId="Test",algorithm="rsa-sha256",headers="(request-target) host date content-type digest content-length",signature="Tqfe2TGMEOwrHLItN2pDnKZiV3cKDWx1dTreYvWRH/kYVT0avw975g25I0/Sig2l60CDkRKTk9ciJMkn8Eanpa7aICnRWbOu38+ozMfQrM7cc06NRSY6+UQ67dn6K4jEW0WNWxhLLwWBSXxhxuXOL3rFKYZliNCundM9FiYk5aE="');

		res.writeHead(200);
		res.write(JSON.stringify(parsed, null, 2));
		res.end();
	};

	options.method = 'POST';
	options.path = '/foo?param=value&pet=dog';
	options.headers.host = 'example.com';
	options.headers['Date'] = 'Thu, 05 Jan 2014 21:31:40 GMT';
	options.headers['content-type'] = 'application/json';
	options.headers['digest'] = 'SHA-256=' + sha256sum.digest('base64');
	options.headers['content-length'] = (jsonMessage.length - 1).toString();
	const signer = crypto.createSign('RSA-SHA256');

	signer.update('(request-target): ' + options.method.toLowerCase() + ' ' + options.path + '\n');
	signer.update('host: ' + options.headers.host + '\n');
	signer.update('date: ' + options.headers['Date'] + '\n');
	signer.update('content-type: ' + options.headers['content-type'] + '\n');
	signer.update('digest: ' + options.headers['digest'] + '\n');
	signer.update('content-length: ' + options.headers['content-length']);

	options.headers['Authorization'] =
    'Signature keyId="Test",algorithm="rsa-sha256",headers='
    + '"(request-target) host date content-type digest content-length"'
    + ',signature="' + signer.sign(rsaPrivate, 'base64') + '"';

	const req = http.request(options, function (res) {
		t.equal(res.statusCode, 200);
		t.end();
	});
	req.write(jsonMessage);
	req.end();
});

void test('tear down', function (t) {
	server.on('close', function () {
		t.end();
	});
	server.close();
});
