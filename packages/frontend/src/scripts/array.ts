/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Returns the array of elements that is not equal to the element
 */
export function erase<T>(a: T, xs: T[]): T[] {
	return xs.filter(x => x !== a);
}

/**
 * Remove all but the first element from every group of equivalent elements
 */
export function unique<T>(xs: T[]): T[] {
	return [...new Set(xs)];
}

export function uniqueBy<TValue, TKey>(values: TValue[], keySelector: (value: TValue) => TKey): TValue[] {
	const map = new Map<TKey, TValue>();

	for (const value of values) {
		const key = keySelector(value);
		if (!map.has(key)) map.set(key, value);
	}

	return [...map.values()];
}

export function sum(xs: number[]): number {
	return xs.reduce((a, b) => a + b, 0);
}
