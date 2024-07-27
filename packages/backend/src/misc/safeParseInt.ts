export const safeParseInt = (value: string, radix = 10): number | null => {
	const result = parseInt(value, radix);
	if (Number.isNaN(result)) return null;
	return result;
};
