// @ts-check

import { spawn } from 'node:child_process';
import { once } from 'node:events';

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {import('node:child_process').SpawnOptions} options
 * @returns {Promise<{ code: number | null; signal: NodeJS.Signals | null }>}
 */
export const run = async (command, args, options) => {
	const child = spawn(command, args, options);

	const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

	/**
	 * @param {NodeJS.Signals} signal
	 */
	const forwardSignal = (signal) => {
		child.kill(signal);
	};

	for (const signal of signals) {
		process.on(signal, forwardSignal);
	}

	try {
		const result =
			/** @type {import('node:child_process').ChildProcessEventMap['close']} */
			(await once(child, 'close'));

		return { code: result[0], signal: result[1] };
	} finally {
		for (const signal of signals) {
			process.off(signal, forwardSignal);
		}
	}
};
