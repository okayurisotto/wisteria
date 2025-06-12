/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { type App, type AsyncComponentLoader, defineAsyncComponent, provide } from 'vue';
import type { ParsedPath, RouteDef } from '@/nirax.js';
import { type IRouter, Router } from '@/nirax.js';
import { $i, iAmModerator } from '@/account.js';
import MkLoading from '@/pages/_loading_.vue';
import MkError from '@/pages/_error_.vue';
import { setMainRouter } from '@/router/main.js';

const parsePath = (path_: `/${string}`): ParsedPath => {
	const pattern = /^(?<prefix>.+)?:(?<name>\w+?)?(?<wildcard>\(\*\))?(?<optional>\?)?$/;

	const parsed: ParsedPath = [];
	const path = path_.substring(1);

	for (const part of path.split('/')) {
		const matchResult = pattern.exec(part);

		if (matchResult !== null) {
			const prefix = matchResult.groups?.['prefix'];
			const name = matchResult.groups?.['name'];
			const wildcard = matchResult.groups?.['wildcard'];
			const optional = matchResult.groups?.['optional'];

			parsed.push({
				name: name ?? '',
				...(prefix !== undefined ? { startsWith: prefix } : {}),
				wildcard: wildcard !== undefined,
				optional: optional !== undefined,
			});
		} else if (part.length !== 0) {
			parsed.push(part);
		} else {
			// ?
		}
	}

	return parsed;
};

const page = (loader: AsyncComponentLoader<any>) => defineAsyncComponent({
	loader: loader,
	loadingComponent: MkLoading,
	errorComponent: MkError,
});

const routes: RouteDef[] = [{
	path: parsePath('/@:initUser/pages/:initPageName/view-source'),
	component: page(() => import('@/pages/page-editor/page-editor.vue')),
}, {
	path: parsePath('/@:username/pages/:pageName'),
	component: page(() => import('@/pages/page.vue')),
}, {
	path: parsePath('/@:acct/following'),
	component: page(() => import('@/pages/user/following.vue')),
}, {
	path: parsePath('/@:acct/followers'),
	component: page(() => import('@/pages/user/followers.vue')),
}, {
	name: 'user',
	path: parsePath('/@:acct/:page?'),
	component: page(() => import('@/pages/user/index.vue')),
}, {
	name: 'note',
	path: parsePath('/notes/:noteId'),
	component: page(() => import('@/pages/note.vue')),
}, {
	name: 'list',
	path: parsePath('/list/:listId'),
	component: page(() => import('@/pages/list.vue')),
}, {
	path: parsePath('/clips/:clipId'),
	component: page(() => import('@/pages/clip.vue')),
}, {
	path: parsePath('/instance-info/:host'),
	component: page(() => import('@/pages/instance-info.vue')),
}, {
	name: 'settings',
	path: parsePath('/settings'),
	component: page(() => import('@/pages/settings/index.vue')),
	loginRequired: true,
	children: [{
		path: parsePath('/profile'),
		name: 'profile',
		component: page(() => import('@/pages/settings/profile.vue')),
	}, {
		path: parsePath('/avatar-decoration'),
		name: 'avatarDecoration',
		component: page(() => import('@/pages/settings/avatar-decoration.vue')),
	}, {
		path: parsePath('/roles'),
		name: 'roles',
		component: page(() => import('@/pages/settings/roles.vue')),
	}, {
		path: parsePath('/privacy'),
		name: 'privacy',
		component: page(() => import('@/pages/settings/privacy.vue')),
	}, {
		path: parsePath('/emoji-picker'),
		name: 'emojiPicker',
		component: page(() => import('@/pages/settings/emoji-picker.vue')),
	}, {
		path: parsePath('/drive'),
		name: 'drive',
		component: page(() => import('@/pages/settings/drive.vue')),
	}, {
		path: parsePath('/drive/cleaner'),
		name: 'drive',
		component: page(() => import('@/pages/settings/drive-cleaner.vue')),
	}, {
		path: parsePath('/notifications'),
		name: 'notifications',
		component: page(() => import('@/pages/settings/notifications.vue')),
	}, {
		path: parsePath('/email'),
		name: 'email',
		component: page(() => import('@/pages/settings/email.vue')),
	}, {
		path: parsePath('/security'),
		name: 'security',
		component: page(() => import('@/pages/settings/security.vue')),
	}, {
		path: parsePath('/general'),
		name: 'general',
		component: page(() => import('@/pages/settings/general.vue')),
	}, {
		path: parsePath('/theme/install'),
		name: 'theme',
		component: page(() => import('@/pages/settings/theme.install.vue')),
	}, {
		path: parsePath('/theme/manage'),
		name: 'theme',
		component: page(() => import('@/pages/settings/theme.manage.vue')),
	}, {
		path: parsePath('/theme'),
		name: 'theme',
		component: page(() => import('@/pages/settings/theme.vue')),
	}, {
		path: parsePath('/navbar'),
		name: 'navbar',
		component: page(() => import('@/pages/settings/navbar.vue')),
	}, {
		path: parsePath('/statusbar'),
		name: 'statusbar',
		component: page(() => import('@/pages/settings/statusbar.vue')),
	}, {
		path: parsePath('/sounds'),
		name: 'sounds',
		component: page(() => import('@/pages/settings/sounds.vue')),
	}, {
		path: parsePath('/import-export'),
		name: 'import-export',
		component: page(() => import('@/pages/settings/import-export.vue')),
	}, {
		path: parsePath('/mute-block'),
		name: 'mute-block',
		component: page(() => import('@/pages/settings/mute-block.vue')),
	}, {
		path: parsePath('/api'),
		name: 'api',
		component: page(() => import('@/pages/settings/api.vue')),
	}, {
		path: parsePath('/apps'),
		name: 'api',
		component: page(() => import('@/pages/settings/apps.vue')),
	}, {
		path: parsePath('/webhook/edit/:webhookId'),
		name: 'webhook',
		component: page(() => import('@/pages/settings/webhook.edit.vue')),
	}, {
		path: parsePath('/webhook/new'),
		name: 'webhook',
		component: page(() => import('@/pages/settings/webhook.new.vue')),
	}, {
		path: parsePath('/webhook'),
		name: 'webhook',
		component: page(() => import('@/pages/settings/webhook.vue')),
	}, {
		path: parsePath('/preferences-backups'),
		name: 'preferences-backups',
		component: page(() => import('@/pages/settings/preferences-backups.vue')),
	}, {
		path: parsePath('/migration'),
		name: 'migration',
		component: page(() => import('@/pages/settings/migration.vue')),
	}, {
		path: parsePath('/accounts'),
		name: 'profile',
		component: page(() => import('@/pages/settings/accounts.vue')),
	}, {
		path: parsePath('/other'),
		name: 'other',
		component: page(() => import('@/pages/settings/other.vue')),
	}, {
		path: parsePath('/'),
		component: page(() => import('@/pages/_empty_.vue')),
	}],
}, {
	path: parsePath('/reset-password/:token?'),
	component: page(() => import('@/pages/reset-password.vue')),
}, {
	path: parsePath('/signup-complete/:code'),
	component: page(() => import('@/pages/signup-complete.vue')),
}, {
	path: parsePath('/announcements'),
	component: page(() => import('@/pages/announcements.vue')),
}, {
	path: parsePath('/about'),
	component: page(() => import('@/pages/about.vue')),
	hash: 'initialTab',
}, {
	path: parsePath('/about-misskey'),
	component: page(() => import('@/pages/about-misskey.vue')),
}, {
	path: parsePath('/invite'),
	name: 'invite',
	component: page(() => import('@/pages/invite.vue')),
}, {
	path: parsePath('/ads'),
	component: page(() => import('@/pages/ads.vue')),
}, {
	path: parsePath('/theme-editor'),
	component: page(() => import('@/pages/theme-editor.vue')),
	loginRequired: true,
}, {
	path: parsePath('/roles/:role'),
	component: page(() => import('@/pages/role.vue')),
}, {
	path: parsePath('/user-tags/:tag'),
	component: page(() => import('@/pages/user-tag.vue')),
}, {
	path: parsePath('/explore'),
	component: page(() => import('@/pages/explore.vue')),
	hash: 'initialTab',
}, {
	path: parsePath('/search'),
	component: page(() => import('@/pages/search.vue')),
	query: {
		q: 'query',
		channel: 'channel',
		type: 'type',
		origin: 'origin',
	},
}, {
	path: parsePath('/authorize-follow'),
	component: page(() => import('@/pages/follow.vue')),
	loginRequired: true,
}, {
	path: parsePath('/share'),
	component: page(() => import('@/pages/share.vue')),
	loginRequired: true,
}, {
	path: parsePath('/api-console'),
	component: page(() => import('@/pages/api-console.vue')),
	loginRequired: true,
}, {
	path: parsePath('/scratchpad'),
	component: page(() => import('@/pages/scratchpad.vue')),
}, {
	path: parsePath('/auth/:token'),
	component: page(() => import('@/pages/auth.vue')),
}, {
	path: parsePath('/miauth/:session'),
	component: page(() => import('@/pages/miauth.vue')),
	query: {
		callback: 'callback',
		name: 'name',
		icon: 'icon',
		permission: 'permission',
	},
}, {
	path: parsePath('/tags/:tag'),
	component: page(() => import('@/pages/tag.vue')),
}, {
	path: parsePath('/pages/new'),
	component: page(() => import('@/pages/page-editor/page-editor.vue')),
	loginRequired: true,
}, {
	path: parsePath('/pages/edit/:initPageId'),
	component: page(() => import('@/pages/page-editor/page-editor.vue')),
	loginRequired: true,
}, {
	path: parsePath('/pages'),
	component: page(() => import('@/pages/pages.vue')),
}, {
	path: parsePath('/play/:id/edit'),
	component: page(() => import('@/pages/flash/flash-edit.vue')),
	loginRequired: true,
}, {
	path: parsePath('/play/new'),
	component: page(() => import('@/pages/flash/flash-edit.vue')),
	loginRequired: true,
}, {
	path: parsePath('/play/:id'),
	component: page(() => import('@/pages/flash/flash.vue')),
}, {
	path: parsePath('/play'),
	component: page(() => import('@/pages/flash/flash-index.vue')),
}, {
	path: parsePath('/custom-emojis-manager'),
	component: page(() => import('@/pages/custom-emojis-manager.vue')),
}, {
	path: parsePath('/avatar-decorations'),
	name: 'avatarDecorations',
	component: page(() => import('@/pages/avatar-decorations.vue')),
}, {
	path: parsePath('/registry/keys/:domain/:path(*)?'),
	component: page(() => import('@/pages/registry.keys.vue')),
}, {
	path: parsePath('/registry/value/:domain/:path(*)?'),
	component: page(() => import('@/pages/registry.value.vue')),
}, {
	path: parsePath('/registry'),
	component: page(() => import('@/pages/registry.vue')),
}, {
	path: parsePath('/admin/user/:userId'),
	component: iAmModerator ? page(() => import('@/pages/admin-user.vue')) : page(() => import('@/pages/not-found.vue')),
}, {
	path: parsePath('/admin/file/:fileId'),
	component: iAmModerator ? page(() => import('@/pages/admin-file.vue')) : page(() => import('@/pages/not-found.vue')),
}, {
	path: parsePath('/admin'),
	component: iAmModerator ? page(() => import('@/pages/admin/index.vue')) : page(() => import('@/pages/not-found.vue')),
	children: [{
		path: parsePath('/overview'),
		name: 'overview',
		component: page(() => import('@/pages/admin/overview.vue')),
	}, {
		path: parsePath('/users'),
		name: 'users',
		component: page(() => import('@/pages/admin/users.vue')),
	}, {
		path: parsePath('/emojis'),
		name: 'emojis',
		component: page(() => import('@/pages/custom-emojis-manager.vue')),
	}, {
		path: parsePath('/avatar-decorations'),
		name: 'avatarDecorations',
		component: page(() => import('@/pages/avatar-decorations.vue')),
	}, {
		path: parsePath('/queue'),
		name: 'queue',
		component: page(() => import('@/pages/admin/queue.vue')),
	}, {
		path: parsePath('/files'),
		name: 'files',
		component: page(() => import('@/pages/admin/files.vue')),
	}, {
		path: parsePath('/federation'),
		name: 'federation',
		component: page(() => import('@/pages/admin/federation.vue')),
	}, {
		path: parsePath('/announcements'),
		name: 'announcements',
		component: page(() => import('@/pages/admin/announcements.vue')),
	}, {
		path: parsePath('/ads'),
		name: 'ads',
		component: page(() => import('@/pages/admin/ads.vue')),
	}, {
		path: parsePath('/roles/:id/edit'),
		name: 'roles',
		component: page(() => import('@/pages/admin/roles.edit.vue')),
	}, {
		path: parsePath('/roles/new'),
		name: 'roles',
		component: page(() => import('@/pages/admin/roles.edit.vue')),
	}, {
		path: parsePath('/roles/:id'),
		name: 'roles',
		component: page(() => import('@/pages/admin/roles.role.vue')),
	}, {
		path: parsePath('/roles'),
		name: 'roles',
		component: page(() => import('@/pages/admin/roles.vue')),
	}, {
		path: parsePath('/database'),
		name: 'database',
		component: page(() => import('@/pages/admin/database.vue')),
	}, {
		path: parsePath('/abuses'),
		name: 'abuses',
		component: page(() => import('@/pages/admin/abuses.vue')),
	}, {
		path: parsePath('/modlog'),
		name: 'modlog',
		component: page(() => import('@/pages/admin/modlog.vue')),
	}, {
		path: parsePath('/settings'),
		name: 'settings',
		component: page(() => import('@/pages/admin/settings.vue')),
	}, {
		path: parsePath('/branding'),
		name: 'branding',
		component: page(() => import('@/pages/admin/branding.vue')),
	}, {
		path: parsePath('/moderation'),
		name: 'moderation',
		component: page(() => import('@/pages/admin/moderation.vue')),
	}, {
		path: parsePath('/email-settings'),
		name: 'email-settings',
		component: page(() => import('@/pages/admin/email-settings.vue')),
	}, {
		path: parsePath('/object-storage'),
		name: 'object-storage',
		component: page(() => import('@/pages/admin/object-storage.vue')),
	}, {
		path: parsePath('/security'),
		name: 'security',
		component: page(() => import('@/pages/admin/security.vue')),
	}, {
		path: parsePath('/relays'),
		name: 'relays',
		component: page(() => import('@/pages/admin/relays.vue')),
	}, {
		path: parsePath('/instance-block'),
		name: 'instance-block',
		component: page(() => import('@/pages/admin/instance-block.vue')),
	}, {
		path: parsePath('/proxy-account'),
		name: 'proxy-account',
		component: page(() => import('@/pages/admin/proxy-account.vue')),
	}, {
		path: parsePath('/external-services'),
		name: 'external-services',
		component: page(() => import('@/pages/admin/external-services.vue')),
	}, {
		path: parsePath('/other-settings'),
		name: 'other-settings',
		component: page(() => import('@/pages/admin/other-settings.vue')),
	}, {
		path: parsePath('/server-rules'),
		name: 'server-rules',
		component: page(() => import('@/pages/admin/server-rules.vue')),
	}, {
		path: parsePath('/invites'),
		name: 'invites',
		component: page(() => import('@/pages/admin/invites.vue')),
	}, {
		path: parsePath('/'),
		component: page(() => import('@/pages/_empty_.vue')),
	}],
}, {
	path: parsePath('/my/notifications'),
	component: page(() => import('@/pages/notifications.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/favorites'),
	component: page(() => import('@/pages/favorites.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/drive/folder/:folder'),
	component: page(() => import('@/pages/drive.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/drive'),
	component: page(() => import('@/pages/drive.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/drive/file/:fileId'),
	component: page(() => import('@/pages/drive.file.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/follow-requests'),
	component: page(() => import('@/pages/follow-requests.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/lists/:listId'),
	component: page(() => import('@/pages/my-lists/list.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/lists'),
	component: page(() => import('@/pages/my-lists/index.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/clips'),
	component: page(() => import('@/pages/my-clips/index.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/antennas/create'),
	component: page(() => import('@/pages/my-antennas/create.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/antennas/:antennaId'),
	component: page(() => import('@/pages/my-antennas/edit.vue')),
	loginRequired: true,
}, {
	path: parsePath('/my/antennas'),
	component: page(() => import('@/pages/my-antennas/index.vue')),
	loginRequired: true,
}, {
	path: parsePath('/timeline/list/:listId'),
	component: page(() => import('@/pages/user-list-timeline.vue')),
	loginRequired: true,
}, {
	path: parsePath('/timeline/antenna/:antennaId'),
	component: page(() => import('@/pages/antenna-timeline.vue')),
	loginRequired: true,
}, {
	path: parsePath('/timeline'),
	component: page(() => import('@/pages/timeline.vue')),
}, {
	name: 'index',
	path: parsePath('/'),
	component: $i ? page(() => import('@/pages/timeline.vue')) : page(() => import('@/pages/welcome.vue')),
	globalCacheKey: 'index',
}, {
	// テスト用リダイレクト設定。ログイン中ユーザのプロフィールにリダイレクトする
	path: parsePath('/redirect-test'),
	redirect: $i ? `@${$i.username}` : '/',
	loginRequired: true,
}, {
	path: parsePath('/:(*)'),
	component: page(() => import('@/pages/not-found.vue')),
}];

function createRouterImpl(path: string): IRouter {
	return new Router(routes, path, !!$i, page(() => import('@/pages/not-found.vue')));
}

/**
 * {@link Router}による画面遷移を可能とするために{@link mainRouter}をセットアップする。
 * また、{@link Router}のインスタンスを作成するためのファクトリも{@link provide}経由で公開する（`routerFactory`というキーで取得可能）
 */
export function setupRouter(app: App) {
	app.provide('routerFactory', createRouterImpl);

	const mainRouter = createRouterImpl(location.pathname + location.search + location.hash);

	window.addEventListener('popstate', (event) => {
		mainRouter.replace(location.pathname + location.search + location.hash, event.state?.key);
	});

	mainRouter.addListener('push', ctx => {
		window.history.pushState({ key: ctx.key }, '', ctx.path);
	});

	mainRouter.addListener('replace', ctx => {
		window.history.replaceState({ key: ctx.key }, '', ctx.path);
	});

	mainRouter.init();

	setMainRouter(mainRouter);
}
