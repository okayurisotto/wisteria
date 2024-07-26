/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'assert';

import { parse } from 'mfm-js';
import { extractMentions } from '@/misc/extract-mentions.js';
import { AcctEntity } from '@/misc/AcctEntity.js';

const localhost = 'misskey.local';

describe('Extract mentions', () => {
	test('simple', () => {
		const ast = parse('@foo @bar @baz');
		const mentions = extractMentions(ast, localhost);
		assert.deepStrictEqual(mentions, [
			AcctEntity.from('foo', null, localhost),
			AcctEntity.from('bar', null, localhost),
			AcctEntity.from('baz', null, localhost),
		]);
	});

	test('nested', () => {
		const ast = parse('@foo **@bar** @baz');
		const mentions = extractMentions(ast, 'misskey.local');
		assert.deepStrictEqual(mentions, [
			AcctEntity.from('foo', null, localhost),
			AcctEntity.from('bar', null, localhost),
			AcctEntity.from('baz', null, localhost),
		]);
	});
});
