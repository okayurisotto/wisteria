import type { MiddlewareHandler } from 'hono';

export const omitSearch: MiddlewareHandler = async (c, next) => {
	const url = new URL(c.req.url);

	if (url.search !== '') {
		return c.redirect(url.pathname, 301);
	}

	await next();
	return;
};
