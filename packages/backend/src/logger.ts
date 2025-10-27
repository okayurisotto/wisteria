/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import chalk from 'chalk';
import colors from 'color-name';
import { formatTime } from '@/misc/formatDate.js';
import { envOption } from './env.js';

export type ColorName = keyof typeof colors;

type Context = {
	name: string;
	color?: ColorName | undefined;
};

type Level = 'error' | 'success' | 'warning' | 'debug' | 'info';

export class Logger {
	private readonly context: Context;
	private parentLogger: Logger | null = null;

	constructor(context: string, color?: ColorName) {
		this.context = {
			name: context,
			color: color,
		};
	}

	public createSubLogger(context: string, color?: ColorName): Logger {
		const logger = new Logger(context, color);
		logger.parentLogger = this;
		return logger;
	}

	private log(
		level: Level,
		message: string,
		data: Record<string, unknown> | null,
		important = false,
		subContexts: Context[] = [],
	): void {
		if (envOption.MK_QUIET) return;

		if (this.parentLogger) {
			this.parentLogger.log(level, message, data, important, [
				this.context,
				...subContexts,
			]);
			return;
		}

		const time = formatTime(new Date());

		const l = (() => {
			switch (level) {
				case 'error': {
					return important ? chalk.bgRed.white('ERR ') : chalk.red('ERR ');
				}
				case 'warning': {
					return chalk.yellow('WARN');
				}
				case 'success': {
					return important ? chalk.bgGreen.white('DONE') : chalk.green('DONE');
				}
				case 'debug': {
					return chalk.gray('VERB');
				}
				case 'info': {
					return chalk.blue('INFO');
				}
			}
		})();

		const contexts = [this.context, ...subContexts].map((d) => {
			return d.color !== undefined
				? chalk.rgb(...colors[d.color])(d.name)
				: chalk.white(d.name);
		});

		const m = (() => {
			switch (level) {
				case 'error': {
					return chalk.red(message);
				}
				case 'warning': {
					return chalk.yellow(message);
				}
				case 'success': {
					return chalk.green(message);
				}
				case 'debug': {
					return chalk.gray(message);
				}
				case 'info': {
					return message;
				}
			}
		})();

		let log = [l, `[${contexts.join(' ')}]`, m].join('\t');
		if (envOption.MK_WITH_LOG_TIME) {
			log = chalk.gray(time) + ' ' + log;
		}

		const args: unknown[] = [important ? chalk.bold(log) : log];
		if (data !== null) {
			args.push(data);
		}
		console.log(...args);
	}

	/** 実行を継続できない状況で使う */
	public error(
		e: string | Error,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		if (e instanceof Error) {
			this.log('error', e.toString(), { ...data, e }, important);
		} else if (typeof e === 'object') {
			// TODO: `e`は`never`となるはずだが信用できないので消せずにいる
			this.log('error', `${e.message ?? e.name ?? e}`, data, important);
		} else {
			this.log('error', e, data, important);
		}
	}

	/** 実行を継続できるが改善すべき状況で使う */
	public warn(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('warning', message, data, important);
	}

	/** 何かに成功した状況で使う */
	public succ(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('success', message, data, important);
	}

	/** デバッグ用に使う(開発者に必要だが利用者に不要な情報) */
	public debug(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		if (!envOption.isProduction || envOption.MK_VERBOSE) {
			this.log('debug', message, data, important);
		}
	}

	public info(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('info', message, data, important);
	}
}
