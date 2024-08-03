/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { envOption } from '@/env.js';
import * as tmp from 'tmp';

export const createTemp = (): Promise<[string, () => void]> => {
	return new Promise<[string, () => void]>((resolve, reject) => {
		tmp.file((err, path, _fd, cleanup) => {
			if (err !== null) {
				reject(err);
				return;
			}

			resolve([path, envOption.isProduction ? cleanup : () => {}]);
		});
	});
};

export const createTempDir = (): Promise<[string, () => void]> => {
	return new Promise<[string, () => void]>((resolve, reject) => {
		tmp.dir({ unsafeCleanup: true }, (err, path, cleanup) => {
			if (err !== null) {
				reject(err);
				return;
			}

			resolve([path, envOption.isProduction ? cleanup : () => {}]);
		});
	});
};
