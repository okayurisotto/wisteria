/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent, reactive, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { showSuspendedDialog } from '@/scripts/show-suspended-dialog.js';
import { i18n } from '@/i18n.js';
import { miLocalStorage } from '@/local-storage.js';
import { del, get, set } from '@/scripts/idb-proxy.js';
import { apiUrl } from '@/config.js';
import { waiting, popup, alert } from '@/os.js';
import { unisonReload, reloadChannel } from '@/scripts/unison-reload.js';

// TODO: 他のタブと永続化されたstateを同期

type Account = Misskey.entities.MeDetailed & { token: string };

const accountData = miLocalStorage.getItem('account');

// TODO: 外部からはreadonlyに
export let $i = accountData ? reactive(JSON.parse(accountData) as Account) : null;

export const iAmModerator = $i != null && ($i.isAdmin === true || $i.isModerator === true);
export const iAmAdmin = $i != null && $i.isAdmin;

export function signinRequired() {
	if ($i == null) throw new Error('signin required');
	return $i;
}

export async function signout() {
	if (!$i) return;

	waiting();
	miLocalStorage.removeItem('account');
	await removeAccount($i.id);
	const accounts = await getAccounts();

	//#region Remove service worker registration
	try {
		if (navigator.serviceWorker.controller) {
			const registration = await navigator.serviceWorker.ready;
			const push = await registration.pushManager.getSubscription();
			if (push) {
				await window.fetch(`${apiUrl}/sw/unregister`, {
					method: 'POST',
					body: JSON.stringify({
						i: $i.token,
						endpoint: push.endpoint,
					}),
					headers: {
						'Content-Type': 'application/json',
					},
				});
			}
		}

		if (accounts.length === 0) {
			await navigator.serviceWorker.getRegistrations()
				.then(registrations => {
					return Promise.all(registrations.map(registration => registration.unregister()));
				});
		}
	} catch (err) {}
	//#endregion

	if (accounts.length > 0) login(accounts[0].token);
	else unisonReload('/');
}

export async function getAccounts(): Promise<{ id: Account['id'], token: Account['token'] }[]> {
	return (await get('accounts')) || [];
}

export async function addAccount(id: Account['id'], token: Account['token']) {
	const accounts = await getAccounts();
	if (!accounts.some(x => x.id === id)) {
		await set('accounts', accounts.concat([{ id, token }]));
	}
}

export async function removeAccount(idOrToken: Account['id']) {
	const accounts = await getAccounts();
	const i = accounts.findIndex(x => x.id === idOrToken || x.token === idOrToken);
	if (i !== -1) accounts.splice(i, 1);

	if (accounts.length > 0) {
		await set('accounts', accounts);
	} else {
		await del('accounts');
	}
}

function fetchAccount(token: string, id?: string, forceShowDialog?: boolean): Promise<Account> {
	return new Promise((done, fail) => {
		window.fetch(`${apiUrl}/i`, {
			method: 'POST',
			body: JSON.stringify({
				i: token,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then(res => new Promise<Account | { error: Record<string, any> }>((done2, fail2) => {
				if (res.status >= 500 && res.status < 600) {
					// サーバーエラー(5xx)の場合をrejectとする
					// （認証エラーなど4xxはresolve）
					return fail2(res);
				}
				res.json().then(done2, fail2);
			}))
			.then(async res => {
				if (res.error) {
					if (res.error.id === 'a8c724b3-6e9c-4b46-b1a8-bc3ed6258370') {
						// SUSPENDED
						if (forceShowDialog || $i && (token === $i.token || id === $i.id)) {
							await showSuspendedDialog();
						}
					} else if (res.error.id === 'e5b3b9f0-2b8f-4b9f-9c1f-8c5c1b2e1b1a') {
						// USER_IS_DELETED
						// アカウントが削除されている
						if (forceShowDialog || $i && (token === $i.token || id === $i.id)) {
							await alert({
								type: 'error',
								title: i18n.ts.accountDeleted,
								text: i18n.ts.accountDeletedDescription,
							});
						}
					} else if (res.error.id === 'b0a7f5f8-dc2f-4171-b91f-de88ad238e14') {
						// AUTHENTICATION_FAILED
						// トークンが無効化されていたりアカウントが削除されたりしている
						if (forceShowDialog || $i && (token === $i.token || id === $i.id)) {
							await alert({
								type: 'error',
								title: i18n.ts.tokenRevoked,
								text: i18n.ts.tokenRevokedDescription,
							});
						}
					} else {
						await alert({
							type: 'error',
							title: i18n.ts.failedToFetchAccountInformation,
							text: JSON.stringify(res.error),
						});
					}

					// rejectかつ理由がtrueの場合、削除対象であることを示す
					fail(true);
				} else {
					(res as Account).token = token;
					done(res as Account);
				}
			})
			.catch(fail);
	});
}

export function updateAccount(accountData: Partial<Account> | null) {
	if (!$i) return;

	if (accountData === null) {
		void fetchAccount($i.token).then((accountData) => {
			$i = accountData;
			miLocalStorage.setItem('account', JSON.stringify($i));
		});
	} else {
		for (const [key, value] of Object.entries(accountData)) {
			$i[key] = value;
		}
		miLocalStorage.setItem('account', JSON.stringify($i));
	}
}

export async function refreshAccount() {
	if (!$i) return;
	return fetchAccount($i.token, $i.id)
		.then(updateAccount, reason => {
			if (reason === true) return signout();
			return;
		});
}

export async function login(token: Account['token'], redirect?: string) {
	const showing = ref(true);
	popup(defineAsyncComponent(() => import('@/components/MkWaitingDialog.vue')), {
		success: false,
		showing: showing,
	}, {}, 'closed');
	if (_DEV_) console.log('logging as token ', token);
	const me = await fetchAccount(token, undefined, true)
		.catch(reason => {
			if (reason === true) {
				// 削除対象の場合
				removeAccount(token);
			}

			showing.value = false;
			throw reason;
		});
	miLocalStorage.setItem('account', JSON.stringify(me));
	await addAccount(me.id, token);

	if (redirect) {
		// 他のタブは再読み込みするだけ
		reloadChannel.postMessage(null);
		// このページはredirectで指定された先に移動
		location.href = redirect;
		return;
	}

	unisonReload();
}

if (_DEV_) {
	(window as any).$i = $i;
}
