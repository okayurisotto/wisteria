/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import chalk from 'chalk';
import { default as convertColor } from 'color-convert';
import { format as dateFormat } from 'date-fns';
import { bindThis } from '@/decorators.js';
import { envOption } from './env.js';
import type { KEYWORD } from 'color-convert/conversions.js';

type Context = {
	name: string;
	color?: KEYWORD | undefined;
};

type Level = 'error' | 'success' | 'warning' | 'debug' | 'info';

export default class Logger {
	private readonly context: Context;
	private parentLogger: Logger | null = null;

	constructor(context: string, color?: KEYWORD) {
		this.context = {
			name: context,
			color: color,
		};
	}

	@bindThis
	public createSubLogger(context: string, color?: KEYWORD): Logger {
		const logger = new Logger(context, color);
		logger.parentLogger = this;
		return logger;
	}

	@bindThis
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

		const time = dateFormat(new Date(), 'HH:mm:ss');

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
			return d.color
				? chalk.rgb(...convertColor.keyword.rgb(d.color))(d.name)
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

	@bindThis
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

	@bindThis
	/** 実行を継続できるが改善すべき状況で使う */
	public warn(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('warning', message, data, important);
	}

	@bindThis
	/** 何かに成功した状況で使う */
	public succ(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('success', message, data, important);
	}

	@bindThis
	/** デバッグ用に使う(開発者に必要だが利用者に不要な情報) */
	public debug(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		if (process.env['NODE_ENV'] !== 'production' || envOption.MK_VERBOSE) {
			this.log('debug', message, data, important);
		}
	}

	@bindThis
	public info(
		message: string,
		data: Record<string, unknown> | null = null,
		important = false,
	): void {
		this.log('info', message, data, important);
	}
}
