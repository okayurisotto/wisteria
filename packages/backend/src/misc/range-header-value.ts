import { safeParseInt } from './safeParseInt.js';

type Range<T> = { start: T; end: T } | { start: T; end: null };

type RangeHeaderValue<T> =
	| { unit: string; suffix: true; length: T }
	| { unit: string; suffix: false; ranges: Range<T>[] };

export const parseRangeHeaderValue = (
	value: string,
): RangeHeaderValue<string> | null => {
	const [unit, rangesPart] = value.split('=', 2);
	if (unit === undefined) return null;
	if (rangesPart === undefined) return null;

	if (rangesPart.startsWith('-')) {
		// suffix length
		return {
			unit,
			suffix: true,
			length: rangesPart.substring('-'.length),
		};
	}

	const ranges = rangesPart
		.split(', ')
		.map<Range<string> | null>((range) => {
			const [start, end] = range.split('-', 1);

			if (start === undefined) {
				return null;
			} else {
				return { start, end: end ?? null };
			}
		})
		.filter(v => v !== null);

	return { unit, suffix: false, ranges };
};

export const parseBytesRangeHeaderValue = (
	value: string,
): RangeHeaderValue<number> | null => {
	const UNIT = 'bytes';

	const result = parseRangeHeaderValue(value);
	if (result === null) return null;
	if (result.unit !== UNIT) return null;

	if (result.suffix) {
		const length = safeParseInt(result.length, 10);
		if (length === null) return null;

		return {
			unit: UNIT,
			suffix: true,
			length,
		};
	} else {
		const ranges = result.ranges
			.map<Range<number> | null>((range) => {
				const start = safeParseInt(range.start, 10);
				if (start === null) return null;

				if (range.end === null) {
					return { start, end: null };
				} else {
					const end = safeParseInt(range.end, 10);
					if (end === null) return null;
					return { start, end };
				}
			})
			.filter(v => v !== null);

		return {
			unit: UNIT,
			suffix: false,
			ranges: ranges,
		};
	}
};

export const chunk = (range: Range<number>, filesize: number) => {
	const end = range.end !== null ? Math.min(range.end, filesize) : filesize;

	return {
		start: range.start,
		end: end,
		chunksize: end - range.start + 1,
	};
};
