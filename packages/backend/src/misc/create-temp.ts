/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { envOption } from '@/env.js';
import * as tmp from 'tmp';

export function createTemp(): Promise<[string, () => void]> {
	return new Promise<[string, () => void]>((res, rej) => {
		tmp.file((e, path, fd, cleanup) => {
			if (e) return rej(e);
			res([path, envOption.isProduction ? cleanup : () => {}]);
		});
	});
}

export function createTempDir(): Promise<[string, () => void]> {
	return new Promise<[string, () => void]>((res, rej) => {
		tmp.dir(
			{
				unsafeCleanup: true,
			},
			(e, path, cleanup) => {
				if (e) return rej(e);
				res([path, envOption.isProduction ? cleanup : () => {}]);
			},
		);
	});
}
