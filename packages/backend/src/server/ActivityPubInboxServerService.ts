/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as crypto from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import httpSignature from 'http-signature';
import secureJson from 'secure-json-parse';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { QueueService } from '@/core/QueueService.js';
import { bindThis } from '@/decorators.js';
import type { IActivity } from '@/core/activitypub/type.js';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyBodyParser, FastifyPluginOptions } from 'fastify';

const checkHttpSignature = (message: IncomingMessage): httpSignature.IParsedSignature | null => {
	let signature: httpSignature.IParsedSignature;

	try {
		signature = httpSignature.parseRequest(message, { 'headers': [] });
	} catch {
		return null;
	}

	if (!signature.params.headers.includes('host')) {
		return null;
	}

	if (!signature.params.headers.includes('digest')) {
		return null;
	}

	return signature;
};

const parseDigestHeaderValue = (value: string): { algo: string; hash: string } | null => {
	const digestPattern = /^([a-zA-Z0-9-]+)=(.+)$/;
	const matchResult = value.match(digestPattern);

	if (matchResult == null) return null;

	const algo = matchResult[1]?.toUpperCase();
	const digestValue = matchResult[2];

	if (algo === undefined || digestValue === undefined) {
		// ???
		return null;
	}

	return { algo, hash: digestValue };
};

const DIGEST_ALGO = new Map([
	['SHA-256', 'sha256'],
]);

const checkDigest = (algo: string, hash: string, body: string | Buffer): boolean | null => {
	const hashAlgo = DIGEST_ALGO.get(algo);
	if (hashAlgo === undefined) return null;

	const hash_ = crypto.createHash(hashAlgo).update(body).digest('base64');
	return hash === hash_;
};

@Injectable()
export class ActivityPubInboxServerService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		private queueService: QueueService,
	) {}

	private async inbox(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		if (request.headers.host !== this.config.host) {
			reply.code(401);
			return;
		}

		if (request.rawBody === undefined) {
			reply.code(400);
			return;
		}

		//#region HTTP Signature

		const signature = checkHttpSignature(request.raw);

		if (signature === null) {
			reply.code(401);
			return;
		}

		//#endregion

		//#region Digest Header

		const digest = request.headers['digest'];

		if (typeof digest !== 'string') {
			reply.code(401);
			return;
		}

		const parsedDigest = parseDigestHeaderValue(digest);
		if (parsedDigest === null) {
			reply.code(401);
			return;
		}

		const isOk = checkDigest(parsedDigest.algo, parsedDigest.hash, request.rawBody);
		if (!isOk) {
			reply.code(401);
			return;
		}

		//#endregion

		await this.queueService.inbox(request.body as IActivity, signature);
		reply.code(202);
	}

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		const almostDefaultJsonParser: FastifyBodyParser<Buffer> = function (request, rawBody, done) {
			if (rawBody.length === 0) {
				const err = new Error('Body cannot be empty!') as any;
				err.statusCode = 400;
				return done(err);
			}

			try {
				const json = secureJson.parse(rawBody.toString('utf8'), null, {
					protoAction: 'ignore',
					constructorAction: 'ignore',
				});
				done(null, json);
			} catch (err: any) {
				err.statusCode = 400;
				return done(err);
			}
		};

		fastify.addContentTypeParser('application/activity+json', { parseAs: 'buffer' }, almostDefaultJsonParser);
		fastify.addContentTypeParser('application/ld+json', { parseAs: 'buffer' }, almostDefaultJsonParser);

		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('Access-Control-Allow-Headers', 'Accept');
			reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
			reply.header('Access-Control-Allow-Origin', '*');
			reply.header('Access-Control-Expose-Headers', 'Vary');
			done();
		});

		fastify.post('/inbox', { config: { rawBody: true }, bodyLimit: 1024 * 64 }, async (request, reply) => {
			return await this.inbox(request, reply);
		});

		fastify.post('/users/:user/inbox', { config: { rawBody: true }, bodyLimit: 1024 * 64 }, async (request, reply) => {
			return await this.inbox(request, reply);
		});

		done();
	}
}
