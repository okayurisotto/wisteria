/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// test is located in test/extract-mentions

import * as mfm from 'mfm-js';
import { AcctEntity } from './AcctEntity.js';

/** @todo 重複を削除 */
export const extractMentions = (nodes: mfm.MfmNode[], localhost: string): AcctEntity[] => {
	const mentionNodes = mfm.extract(nodes, node => node.type === 'mention') as mfm.MfmMention[];

	const mentions = mentionNodes
		.map(x => x.props.acct)
		.map(acct => AcctEntity.parse(acct, localhost))
		.filter(acct => acct !== null)
		.map(acct => acct);

	return mentions;
};
