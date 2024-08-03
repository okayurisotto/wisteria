// Copyright 2011 Joyent, Inc.  All rights reserved.

import { createServer, get } from 'http';
import { test } from 'tap';
import { v4 as uuid } from 'uuid';
import { rfc1123 } from 'jsprim';
import { parseRequest } from '../built/index.js';

///--- Globals

var options = null;
var server = null;
var socket = null;

///--- Tests

test('setup', function(t) {
  socket = '/tmp/.' + uuid();
  options = {
    socketPath: socket,
    path: '/',
    headers: {}
  };

  server = createServer(function(req, res) {
    server.tester(req, res);
  });

  server.listen(socket, function() {
    t.end();
  });
});


test('no authorization', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'MissingHeaderError');
    }
    res.writeHead(200);
    res.end();
  };

  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('bad scheme', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'scheme was not "Signature"');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Basic blahBlahBlah';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('no key id', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'keyId was not specified');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature foo';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('key id no value', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'keyId was not specified');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature keyId=';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('key id no quotes', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId=foo,algorithm=hmac-sha1,signature=aabbcc';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('key id param quotes', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature "keyId"="key"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('param name with space', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature key Id="key"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('no algorithm', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'algorithm was not specified');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature keyId="foo"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('algorithm no value', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'algorithm was not specified');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature keyId="foo",algorithm=';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('no signature', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'signature was not specified');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization = 'Signature keyId="foo",algorithm="foo"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('invalid algorithm', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'InvalidParamsError');
      t.equal(e.message, 'foo is not supported');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="foo",algorithm="foo",signature="aaabbbbcccc"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('no date header', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'MissingHeaderError');
      t.equal(e.message, 'date was not in the request');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('valid numeric parameter', function(t) {
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', 'digest']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.fail(e.stack);
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=123456,' +
    'headers="(created) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('invalid numeric parameter', function(t) {
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', 'digest']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
      res.writeHead(200);
      res.end();
      return;
    }

    t.fail("should throw error");
    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=123@456,' +
    'headers="(created) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('invalid numeric parameter - decimal', function(t) {
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', 'digest']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
      res.writeHead(200);
      res.end();
      return;
    }

    t.fail("should throw error");
    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=123.456,' +
    'headers="(created) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('invalid numeric parameter - signed integer', function(t) {
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', 'digest']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'InvalidHeaderError');
      t.equal(e.message, 'bad param format');
      res.writeHead(200);
      res.end();
      return;
    }

    t.fail("should throw error");
    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=-123456,' +
    'headers="(created) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('created in future', function(t) {
  var skew = 1000;
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', 'digest'],
      clockSkew: skew
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'ExpiredRequestError');
      t.match(e.message, new RegExp('Created lies in the future.*'));
      res.writeHead(200);
      res.end();
      return;
    }

    t.fail("should throw error");
    res.writeHead(200);
    res.end();
  };

  var created = Math.floor(Date.now() / 1000) + skew + 10;
  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=' + created + ',' +
    'headers="(created) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('expires expired', function(t) {
  var skew = 1000;
  server.tester = function(req, res) {
    var options = {
      headers: ['(expires)', 'digest'],
      clockSkew: skew
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'ExpiredRequestError');
      t.match(e.message, new RegExp('Request expired.*'));
      res.writeHead(200);
      res.end();
      return;
    }

    t.fail("should throw error");
    res.writeHead(200);
    res.end();
  };

  var expires = Math.floor(Date.now() / 1000) - skew - 1;
  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'expires=' + expires + ',' +
    'headers="(expires) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('valid created and expires with skew', function(t) {
  var skew = 1000;
  server.tester = function(req, res) {
    var options = {
      headers: ['(created)', '(expires)', 'digest'],
      clockSkew: skew
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.fail(e.stack);
    }

    res.writeHead(200);
    res.end();
  };

  //created is in the future but within allowed skew
  var created = Math.floor(Date.now() / 1000) + skew - 1;
  //expires is in the past but within allowed skew
  var expires = Math.floor(Date.now() / 1000) - skew + 10;
  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'created=' + created + ',' + 'expires=' + expires + ',' +
    'headers="(created) (expires) dIgEsT",signature="digitalSignature"';
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});



test('valid default headers', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.fail(e.stack);
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
  options.headers.Date = rfc1123(new Date());
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('valid custom authorizationHeaderName', function(t) {
  server.tester = function(req, res) {
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
  options.headers.Date = rfc1123(new Date());
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('explicit headers missing', function(t) {
  server.tester = function(req, res) {
    try {
      parseRequest(req);
    } catch (e) {
      t.equal(e.name, 'MissingHeaderError');
      t.equal(e.message, 'digest was not in the request');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="foo",algorithm="rsa-sha256",' +
    'headers="date digest",signature="aaabbbbcccc"';
  options.headers.Date = rfc1123(new Date());
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('valid explicit headers request-line', function(t) {
  server.tester = function(req, res) {
    var parsed = parseRequest(req);
    res.writeHead(200);
    res.write(JSON.stringify(parsed, null, 2));
    res.end();
  };


  options.headers.Authorization =
    'Signature keyId="fo,o",algorithm="RSA-sha256",' +
    'headers="dAtE dIgEsT request-line",' +
    'extensions="blah blah",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['digest'] = uuid();

  get(options, function(res) {
    t.equal(res.statusCode, 200);

    var body = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      console.log(body);
      var parsed = JSON.parse(body);
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
                   ('date: ' + options.headers.Date + '\n' +
                    'digest: ' + options.headers['digest'] + '\n' +
                    'GET / HTTP/1.1'));
      t.equal(parsed.params.keyId, parsed.keyId);
      t.equal(parsed.params.algorithm.toUpperCase(),
              parsed.algorithm);
      t.end();
    });
  });
});

test('valid explicit headers request-line strict true', function(t) {
  server.tester = function(req, res) {

    try {
      parseRequest(req, {strict: true});
    } catch (e) {
      t.equal(e.name, 'StrictParsingError');
      t.equal(e.message, 'request-line is not a valid header with strict parsing enabled.');
    }

    res.writeHead(200);
    res.end();
  };


  options.headers.Authorization =
    'Signature keyId="fo,o",algorithm="RSA-sha256",' +
    'headers="dAtE dIgEsT request-line",' +
    'extensions="blah blah",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['digest'] = uuid();

  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});

test('valid explicit headers request-target', function(t) {
  server.tester = function(req, res) {
    var parsed = parseRequest(req);
    res.writeHead(200);
    res.write(JSON.stringify(parsed, null, 2));
    res.end();
  };


  options.headers.Authorization =
    'Signature keyId="fo,o",algorithm="RSA-sha256",' +
    'headers="dAtE dIgEsT (request-target)",' +
    'extensions="blah blah",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['digest'] = uuid();

  get(options, function(res) {
    t.equal(res.statusCode, 200);

    var body = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      console.log(body);
      var parsed = JSON.parse(body);
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
                   ('date: ' + options.headers.Date + '\n' +
                    'digest: ' + options.headers['digest'] + '\n' +
                    '(request-target): get /'));
      t.equal(parsed.params.keyId, parsed.keyId);
      t.equal(parsed.params.algorithm.toUpperCase(),
              parsed.algorithm);
      t.end();
    });
  });
});


test('expired', function(t) {
  server.tester = function(req, res) {
    var options = {
      clockSkew: 1,
      headers: ['date']
    };

    setTimeout(function() {
      try {
        parseRequest(req);
      } catch (e) {
        t.equal(e.name, 'ExpiredRequestError');
        t.ok(/clock skew of \d\.\d+s was greater than 1s/.test(e.message));
      }

      res.writeHead(200);
      res.end();
    }, 1200);
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'headers="dAtE dIgEsT",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('missing required header', function(t) {
  server.tester = function(req, res) {
    var options = {
      clockSkew: 1,
      headers: ['date', 'x-unit-test']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.equal(e.name, 'MissingHeaderError');
      t.equal(e.message, 'x-unit-test was not a signed header');
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['content-md5'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('valid mixed case headers', function(t) {
  server.tester = function(req, res) {
    var options = {
      clockSkew: 1,
      headers: ['Date', 'Content-MD5']
    };

    try {
      parseRequest(req, options);
    } catch (e) {
      t.fail(e.stack);
    }

    res.writeHead(200);
    res.end();
  };

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['content-md5'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});


test('not whitelisted algorithm', function(t) {
  server.tester = function(req, res) {
    var options = {
      clockSkew: 1,
      algorithms: ['rsa-sha1']
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

  options.headers.Authorization =
    'Signature keyId="f,oo",algorithm="RSA-sha256",' +
    'headers="dAtE dIgEsT",signature="digitalSignature"';
  options.headers.Date = rfc1123(new Date());
  options.headers['digest'] = uuid();
  get(options, function(res) {
    t.equal(res.statusCode, 200);
    t.end();
  });
});




test('tearDown', function(t) {
  server.on('close', function() {
    t.end();
  });
  server.close();
});
