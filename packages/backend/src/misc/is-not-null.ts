/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// we are using {} as "any non-nullish value" as expected
export function isNotNull<T extends {}>(input: T | undefined | null): input is T {
	return input != null;
}
