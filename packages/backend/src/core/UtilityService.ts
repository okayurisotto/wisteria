/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { URL } from 'node:url';
import { toASCII } from 'punycode';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';

@Injectable()
export class UtilityService {
	constructor(
		@Inject(DI.config)
		private readonly config: Config,
	) {}

	public isSelfHost(host: string | null): boolean {
		if (host == null) return true;
		return this.toPuny(this.config.host) === this.toPuny(host);
	}

	public isBlockedHost(blockedHosts: string[], host: string | null): boolean {
		if (host == null) return false;
		return blockedHosts.some(x => `.${host.toLowerCase()}`.endsWith(`.${x}`));
	}

	public isSilencedHost(silencedHosts: string[] | undefined, host: string | null): boolean {
		if (!silencedHosts || host == null) return false;
		return silencedHosts.some(x => `.${host.toLowerCase()}`.endsWith(`.${x}`));
	}

	public isKeyWordIncluded(text: string, keyWords: string[]): boolean {
		if (keyWords.length === 0) return false;
		if (text === '') return false;

		const regexpregexp = /^\/(.+)\/(.*)$/;

		const matched = keyWords.some((filter) => {
			// represents RegExp
			const regexp = filter.match(regexpregexp);
			// This should never happen due to input sanitisation.
			if (!regexp) {
				const words = filter.split(' ');
				return words.every(keyword => text.includes(keyword));
			}
			// This should never happen due to input sanitisation.
			return false;
		});

		return matched;
	}

	public extractDbHost(uri: string): string {
		const url = new URL(uri);
		return this.toPuny(url.hostname);
	}

	public toPuny(host: string): string {
		return toASCII(host.toLowerCase());
	}

	public toPunyNullable(host: string | null | undefined): string | null {
		if (host == null) return null;
		return toASCII(host.toLowerCase());
	}
}
