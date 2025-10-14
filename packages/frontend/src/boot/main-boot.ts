/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createApp, defineAsyncComponent, markRaw } from 'vue';
import { common } from './common.js';
import { i18n } from '@/i18n.js';
import { alert, confirm, popup, post } from '@/os.js';
import { useStream } from '@/stream.js';
import * as sound from '@/scripts/sound.js';
import { $i, signout, updateAccount } from '@/account.js';
import { fetchInstance, instance } from '@/instance.js';
import { defaultStore } from '@/store.js';
import { makeHotkey } from '@/scripts/hotkey.js';
import { miLocalStorage } from '@/local-storage.js';
import { initializeSw } from '@/scripts/initialize-sw.js';
import { mainRouter } from '@/router/main.js';
import { colorScheme, selectedColorScheme } from '@/themes/colorScheme.js';

export async function mainBoot() {
	const { isClientUpdated } = await common(() => createApp(
		new URLSearchParams(window.location.search).has('zen')
			? defineAsyncComponent(() => import('@/ui/zen.vue'))
			: !$i
				? defineAsyncComponent(() => import('@/ui/visitor.vue'))
				: defineAsyncComponent(() => import('@/ui/universal.vue')),
	));

	if (isClientUpdated && $i) {
		popup(defineAsyncComponent(() => import('@/components/MkUpdated.vue')), {}, {}, 'closed');
	}

	const stream = useStream();

	let reloadDialogShowing = false;
	stream.on('_disconnected_', () => {
		if (defaultStore.state.serverDisconnectedBehavior === 'reload') {
			location.reload();
		} else if (defaultStore.state.serverDisconnectedBehavior === 'dialog') {
			if (reloadDialogShowing) return;

			reloadDialogShowing = true;
			void confirm({
				type: 'warning',
				title: i18n.ts.disconnectedFromServer,
				text: i18n.ts.reloadConfirm,
			}).then(({ canceled }) => {
				reloadDialogShowing = false;
				if (!canceled) {
					location.reload();
				}
			});
		}
	});

	const hotkeys = {
		'd': (): void => {
			if (colorScheme.value === 'dark') {
				selectedColorScheme.value = 'light';
			} else if (colorScheme.value === 'light') {
				selectedColorScheme.value = 'dark';
			}
		},
		's': (): void => {
			mainRouter.push('/search');
		},
	};

	if ($i) {
		// only add post shortcuts if logged in
		hotkeys['p|n'] = post;

		for (const announcement of ($i.unreadAnnouncements ?? []).filter(x => x.display === 'dialog')) {
			popup(defineAsyncComponent(() => import('@/components/MkAnnouncementDialog.vue')), {
				announcement,
			}, {}, 'closed');
		}

		stream.on('announcementCreated', (ev) => {
			const announcement = ev.announcement;
			if (announcement.display === 'dialog') {
				popup(defineAsyncComponent(() => import('@/components/MkAnnouncementDialog.vue')), {
					announcement,
				}, {}, 'closed');
			}
		});

		if ($i.isDeleted) {
			alert({
				type: 'warning',
				text: i18n.ts.accountDeletionInProgress,
			});
		}

		miLocalStorage.setItem('lastUsed', Date.now().toString());

		const latestDonationInfoShownAt = miLocalStorage.getItem('latestDonationInfoShownAt');
		const neverShowDonationInfo = miLocalStorage.getItem('neverShowDonationInfo');
		if (neverShowDonationInfo !== 'true' && (new Date($i.createdAt).getTime() < (Date.now() - (1000 * 60 * 60 * 24 * 3))) && !location.pathname.startsWith('/miauth')) {
			if (latestDonationInfoShownAt == null || (new Date(latestDonationInfoShownAt).getTime() < (Date.now() - (1000 * 60 * 60 * 24 * 30)))) {
				popup(defineAsyncComponent(() => import('@/components/MkDonation.vue')), {}, {}, 'closed');
			}
		}

		fetchInstance().then(() => {
			const modifiedVersionMustProminentlyOfferInAgplV3Section13Read = miLocalStorage.getItem('modifiedVersionMustProminentlyOfferInAgplV3Section13Read');
			if (modifiedVersionMustProminentlyOfferInAgplV3Section13Read !== 'true' && instance.repositoryUrl !== 'https://github.com/misskey-dev/misskey') {
				popup(defineAsyncComponent(() => import('@/components/MkSourceCodeAvailablePopup.vue')), {}, {}, 'closed');
			}
		});

		if ('Notification' in window) {
			// 許可を得ていなかったらリクエスト
			if (Notification.permission === 'default') {
				Notification.requestPermission();
			}
		}

		const main = markRaw(stream.useChannel('main', null, 'System'));

		// 自分の情報が更新されたとき
		main.on('meUpdated', () => {
			updateAccount(null);
		});

		main.on('readAllNotifications', () => {
			updateAccount({
				hasUnreadNotification: false,
				unreadNotificationsCount: 0,
			});
		});

		main.on('unreadNotification', () => {
			const unreadNotificationsCount = ($i?.unreadNotificationsCount ?? 0) + 1;
			updateAccount({
				hasUnreadNotification: true,
				unreadNotificationsCount,
			});
		});

		main.on('unreadMention', () => {
			updateAccount({ hasUnreadMentions: true });
		});

		main.on('readAllUnreadMentions', () => {
			updateAccount({ hasUnreadMentions: false });
		});

		main.on('unreadSpecifiedNote', () => {
			updateAccount({ hasUnreadSpecifiedNotes: true });
		});

		main.on('readAllUnreadSpecifiedNotes', () => {
			updateAccount({ hasUnreadSpecifiedNotes: false });
		});

		main.on('readAllAntennas', () => {
			updateAccount({ hasUnreadAntenna: false });
		});

		main.on('unreadAntenna', () => {
			updateAccount({ hasUnreadAntenna: true });
			sound.playMisskeySfx('antenna');
		});

		main.on('readAllAnnouncements', () => {
			updateAccount({ hasUnreadAnnouncement: false });
		});

		// トークンが再生成されたとき
		// このままではMisskeyが利用できないので強制的にサインアウトさせる
		main.on('myTokenRegenerated', () => {
			signout();
		});
	}

	// shortcut
	document.addEventListener('keydown', makeHotkey(hotkeys));

	initializeSw();
}
