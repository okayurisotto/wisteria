import { lstat } from 'node:fs/promises';
import type { MiddlewareHandler } from 'hono';
import posixPath from 'node:path/posix';
import path from 'node:path';
import { serveStaticFile } from './serveStaticFile.js';

export const serveStaticDir = (opts: {
	path: string;
	mountpoint: string;
	index: string | null;
}): MiddlewareHandler => {
	return async (c, next) => {
		if (c.finalized) return next();

		const relpath = posixPath.relative(opts.mountpoint, c.req.path);

		let filepath = path.join(opts.path, relpath);

		if (opts.index !== null) {
			const stat = await lstat(filepath).catch(() => null);
			if (stat === null) return next();

			if (stat.isDirectory()) {
				filepath = path.join(filepath, opts.index);
			}
		}

		return serveStaticFile({ path: filepath })(c, next);
	};
};
