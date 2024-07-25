/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import * as nsfw from 'nsfwjs';
import si from 'systeminformation';
import { Mutex } from 'async-mutex';
import { bindThis } from '@/decorators.js';
import { NSFW_MODEL_DIR } from '@/path.js';

const REQUIRED_CPU_FLAGS = ['avx2', 'fma'];
let isSupportedCpu: undefined | boolean = undefined;

@Injectable()
export class AiService {
	private model: nsfw.NSFWJS;
	private modelLoadMutex: Mutex = new Mutex();

	@bindThis
	public async detectSensitive(path: string): Promise<nsfw.predictionType[] | null> {
		try {
			if (isSupportedCpu === undefined) {
				const cpuFlags = await this.getCpuFlags();
				isSupportedCpu = REQUIRED_CPU_FLAGS.every(required => cpuFlags.includes(required));
			}

			if (!isSupportedCpu) {
				console.error('This CPU cannot use TensorFlow.');
				return null;
			}

			const tf = await import('@tensorflow/tfjs-node');

			if (this.model == null) {
				await this.modelLoadMutex.runExclusive(async () => {
					if (this.model == null) {
						this.model = await nsfw.load(NSFW_MODEL_DIR, { size: 299 });
					}
				});
			}

			const buffer = await fs.promises.readFile(path);
			const image = await tf.node.decodeImage(buffer, 3) as any;
			try {
				const predictions = await this.model.classify(image);
				return predictions;
			} finally {
				image.dispose();
			}
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	@bindThis
	private async getCpuFlags(): Promise<string[]> {
		const str = await si.cpuFlags();
		return str.split(/\s+/);
	}
}
