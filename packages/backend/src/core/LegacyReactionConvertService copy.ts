/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { ReactionDecodeService } from './ReactionDecodeService.js';
import { LEGACY_EMOJIS } from './LEGACY_EMOJIS.js';

@Injectable()
export class LegacyReactionConvertService {
	constructor(private readonly reactionDecodeService: ReactionDecodeService) {}

	@bindThis
	public convertLegacyReaction(reaction: string): string {
		reaction = this.reactionDecodeService.decodeReaction(reaction).reaction;
		return LEGACY_EMOJIS.get(reaction) ?? reaction;
	}

	@bindThis
	public convertLegacyReactions(reactions: Record<string, number>) {
		return Object.fromEntries(
			Object.entries(reactions).reduce((prev, [key, value]) => {
				if (value <= 0) return prev;

				const name = this.convertLegacyReaction(key);
				const decodedName =
					this.reactionDecodeService.decodeReaction(name).reaction;

				return prev.set(decodedName, (prev.get(decodedName) ?? 0) + value);
			}, new Map<string, number>()),
		);
	}
}
