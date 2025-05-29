/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { MiNote } from '@/models/Note.js';
import type { z } from 'zod';
import type { NoteSchema } from '@/models/zod/note.js';
import type { NotificationSchema } from '@/models/zod/notification.js';

export function isInstanceMuted(note: z.infer<typeof NoteSchema> | MiNote, mutedInstances: Set<string>): boolean {
	if (mutedInstances.has(note.user?.host ?? '')) return true;
	if (mutedInstances.has(note.reply?.user?.host ?? '')) return true;
	if (mutedInstances.has(note.renote?.user?.host ?? '')) return true;

	return false;
}

export function isUserFromMutedInstance(
	notification: z.infer<typeof NotificationSchema>,
	mutedInstances: Set<string>,
): boolean {
	return (
		'user' in notification &&
		notification.user.host !== null &&
		mutedInstances.has(notification.user.host)
	);
}
