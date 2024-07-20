/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class MemoryKVCache<T> {
	public readonly cache = new Map<string, { date: number; value: T }>();

	public constructor(private readonly lifetime: number) {}

	public set(key: string, value: T): void {
		this.cache.set(key, { date: Date.now(), value });
	}

	public get(key: string): T | undefined {
		const cached = this.cache.get(key);
		if (cached === undefined) return undefined;

		const now = Date.now();
		if (now - cached.date > this.lifetime) {
			this.cache.delete(key);
			return undefined;
		}

		return cached.value;
	}

	public delete(key: string): void {
		this.cache.delete(key);
	}
}
