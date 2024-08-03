export const includes = <const T extends unknown[]>(
	values: readonly [...T],
	value: unknown,
): value is T[number] => {
	return values.includes(value);
};
