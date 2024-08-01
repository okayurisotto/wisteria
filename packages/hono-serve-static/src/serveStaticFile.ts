import { createReadStream } from 'node:fs';
import { lstat } from 'node:fs/promises';
import type { MiddlewareHandler } from 'hono';
import mime from 'mime/lite';

export const serveStaticFile = (opts: { path: string }): MiddlewareHandler => {
	return async (c, next) => {
		if (c.finalized) return next();

		const stat = await lstat(opts.path).catch(() => null);
		if (stat === null) return next();
		if (!stat.isFile()) return next();

		const mimetype = mime.getType(opts.path);
		if (mimetype !== null) {
			c.header('Content-Type', mimetype);
		}

		if (c.req.method === 'HEAD') {
			c.header('Content-Length', stat.size.toString());
			c.status(200);
			return c.body(null);
		}

		const stream = createReadStream(opts.path);
		const rangeHeaderValue = c.req.header('range') ?? null;

		if (rangeHeaderValue === null) {
			c.status(200);
			return c.body(stream);
		} else {
			// TODO
			c.status(400);
			return c.body(null);
		}
	};
};
