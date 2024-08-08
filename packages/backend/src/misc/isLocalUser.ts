import type { MiUser, MiLocalUser } from '@/models/User.js';

export function isLocalUser(user: MiUser): user is MiLocalUser;
export function isLocalUser<T extends { host: MiUser['host'] }>(user: T): user is T & { host: null };
export function isLocalUser(user: MiUser | { host: MiUser['host'] }): boolean {
	return user.host == null;
}
