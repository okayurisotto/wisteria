import type { MiUser, MiRemoteUser } from '@/models/User';
import { isLocalUser } from '@/misc/isLocalUser.js';

export function isRemoteUser(user: MiUser): user is MiRemoteUser;
export function isRemoteUser<T extends { host: MiUser['host'] }>(user: T): user is (T & { host: string });
export function isRemoteUser(user: MiUser | { host: MiUser['host'] }): boolean {
	return !isLocalUser(user);
}
