/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as httpSignature from 'http-signature/web';
import secureJson from 'secure-json-parse';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { QueueService } from '@/core/QueueService.js';
import type { IActivity } from '@/core/activitypub/type.js';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';

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

	private async inbox(c: Context) {
		if (c.req.header('host') !== this.config.host) {
			return c.body(null, 401);
		}

		const body = Buffer.from(await c.req.arrayBuffer());

		// #region HTTP Signature

		const signature = httpSignature.parseRequest(c.req.raw);

		if (!signature.ok) {
			return c.body(null, 401);
		}

		// #endregion

		// #region Digest Header

		const digest = c.req.header('digest');

		if (typeof digest !== 'string') {
			return c.body(null, 401);
		}

		const parsedDigest = parseDigestHeaderValue(digest);
		if (parsedDigest === null) {
			return c.body(null, 401);
		}

		const isOk = checkDigest(parsedDigest.algo, parsedDigest.hash, body);
		if (!isOk) {
			return c.body(null, 401);
		}

		// #endregion

		let data: unknown;
		try {
			data = secureJson.parse(body, null, {
				constructorAction: 'ignore',
				protoAction: 'ignore',
			});
		} catch {
			return c.body(null, 400);
		}

		await this.queueService.inbox(data as IActivity, signature.value.signature, signature.value.signingString);
		return c.body(null, 202);
	}

	public createServer(): Hono {
		const hono = new Hono();

		const setInboxHeaders: MiddlewareHandler = async (c, next) => {
			c.header('Access-Control-Allow-Headers', 'Accept');
			c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
			c.header('Access-Control-Allow-Origin', '*');
			c.header('Access-Control-Expose-Headers', 'Vary');

			await next();
		};

		hono.post('/inbox', bodyLimit({ maxSize: 1024 * 64 }), setInboxHeaders, async (c) => {
			return await this.inbox(c);
		});

		hono.post('/users/:user/inbox', bodyLimit({ maxSize: 1024 * 64 }), setInboxHeaders, async (c) => {
			return await this.inbox(c);
		});

		return hono;
	}
}
