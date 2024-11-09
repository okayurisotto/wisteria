/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Logger, type ColorName } from '@/logger.js';

@Injectable()
export class LoggerService {
	public getLogger(domain: string, color?: ColorName | undefined) {
		return new Logger(domain, color);
	}
}
