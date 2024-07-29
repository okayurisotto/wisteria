/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Predicate } from './relation.js';

/**
 * Count the number of elements that satisfy the predicate
 */

export function countIf<T>(f: Predicate<T>, xs: T[]): number {
	return xs.filter(f).length;
}

/**
 * Concatenate an array of arrays
 */
export function concat<T>(xss: T[][]): T[] {
	return ([] as T[]).concat(...xss);
}

/**
 * Intersperse the element between the elements of the array
 * @param sep The element to be interspersed
 */
export function intersperse<T>(sep: T, xs: T[]): T[] {
	return concat(xs.map(x => [sep, x])).slice(1);
}

/**
 * Remove all but the first element from every group of equivalent elements
 */
export function unique<T>(xs: T[]): T[] {
	return [...new Set(xs)];
}

export function toArray<T>(x: T | T[] | undefined): T[] {
	return Array.isArray(x) ? x : x != null ? [x] : [];
}

export function toSingle<T>(x: T | T[] | undefined): T | undefined {
	return Array.isArray(x) ? x[0] : x;
}
