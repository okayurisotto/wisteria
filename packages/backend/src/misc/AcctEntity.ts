/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { toASCII } from 'punycode';

export class AcctEntity {
	public static from(
		username: string,
		host: string | null,
		localhost: string,
	): AcctEntity {
		const normalizedLocalhost = toASCII(localhost).toLowerCase();

		const domain_ = (() => {
			if (host === null) return null;

			const normalizedHost = toASCII(host).toLowerCase();
			if (normalizedHost === normalizedLocalhost) return null;

			return normalizedHost;
		})();

		const omitted = host === null;

		return new AcctEntity(username, domain_, normalizedLocalhost, omitted);
	}

	public static parse(value: string, localhost: string): AcctEntity | null {
		const normalizedLocalhost = toASCII(localhost).toLowerCase();

		const matchResult = value.match(/^@?([^@]+?)(?:@(.+?))?$/);
		if (matchResult === null) {
			// Syntax Error
			return null;
		}

		const username = matchResult[1];
		if (username === undefined) {
			// ???
			return null;
		}

		const host = (() => {
			const hostPart = matchResult[2];
			if (hostPart === undefined) return null;

			const normalizedHost = toASCII(hostPart).toLowerCase();
			if (normalizedHost === normalizedLocalhost) return null;

			return normalizedHost;
		})();

		const omitted = matchResult[2] === undefined;

		return new AcctEntity(username, host, normalizedLocalhost, omitted);
	}

	private constructor(
		public readonly username: string,
		public readonly host: string | null,
		public readonly localDomain: string,
		public readonly omitted: boolean,
	) {}

	public is(mention: AcctEntity): boolean {
		if (this.username !== mention.username) return false;

		if (this.localDomain === mention.localDomain) {
			return this.host === mention.host;
		} else {
			const a = this.host ?? this.localDomain;
			const b = mention.host ?? mention.localDomain;
			return a === b;
		}
	}

	public toShortString(): `@${string}` | null {
		if (this.host !== null) return null;
		return `@${this.username}` as const;
	}

	/** @deprecated */
	public toLongStringLegacy(): `${string}@${string}` {
		return `${this.username}@${this.host ?? this.localDomain}`;
	}

	public toLongString(): `@${string}@${string}` {
		return `@${this.username}@${this.host ?? this.localDomain}`;
	}

	public toAcctURI(): `acct:${string}@${string}` {
		return `acct:${this.username}@${this.host ?? this.localDomain}`;
	}
}
