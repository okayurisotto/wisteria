type DeepPartial<T> = Partial<{
	[k in keyof T]: Partial<T[k]>;
}>;

export const merge = <T extends Record<string | symbol, unknown>>(
	locales: DeepPartial<T>[],
	base: T,
): T => {
	return new Proxy<T>(base, {
		get(target, prop, _receiver) {
			if (typeof target[prop] !== "object") {
				for (const locale of locales) {
					if (locale[prop]) return locale[prop];
				}

				return target[prop];
			} else {
				return merge(
					locales.map((locale) => locale[prop]).filter(v => v !== undefined),
					target[prop],
				);
			}
		},
	});
};
