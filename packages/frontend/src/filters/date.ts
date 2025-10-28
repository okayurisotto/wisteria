/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { dateTimeFormat } from '@/scripts/intl-const.js';

export const dateString = (d: string) => dateTimeFormat.format(new Date(d));
