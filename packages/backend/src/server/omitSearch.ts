import type { MiddlewareHandler } from 'hono';

export const omitSearch: MiddlewareHandler = async (c, next) => {
	const url = new URL(c.req.url);
	url.search = '';

	if (url.href !== c.req.url) {
		return c.redirect(url.href, 301);
	}

	await next();
	return;
};
