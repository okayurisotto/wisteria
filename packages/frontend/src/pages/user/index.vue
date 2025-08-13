<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs"/></template>
	<div>
		<div v-if="user">
			<MkHorizontalSwipe v-model:tab="tab" :tabs="headerTabs">
				<XHome v-if="tab === 'home'" key="home" :user="user"/>
				<MkSpacer v-else-if="tab === 'notes'" key="notes" :contentMax="800" style="padding-top: 0">
					<XTimeline :user="user"/>
				</MkSpacer>
				<XReactions v-else-if="tab === 'reactions'" key="reactions" :user="user"/>
				<XClips v-else-if="tab === 'clips'" key="clips" :user="user"/>
				<XLists v-else-if="tab === 'lists'" key="lists" :user="user"/>
				<XPages v-else-if="tab === 'pages'" key="pages" :user="user"/>
				<XRaw v-else-if="tab === 'raw'" key="raw" :user="user"/>
			</MkHorizontalSwipe>
		</div>
		<MkError v-else-if="error" @retry="fetchUser()"/>
		<MkLoading v-else/>
	</div>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { acct as getAcct } from '@/filters/user.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';
import MkHorizontalSwipe from '@/components/MkHorizontalSwipe.vue';

const XHome = defineAsyncComponent(() => import('./home.vue'));
const XTimeline = defineAsyncComponent(() => import('./index.timeline.vue'));
const XReactions = defineAsyncComponent(() => import('./reactions.vue'));
const XClips = defineAsyncComponent(() => import('./clips.vue'));
const XLists = defineAsyncComponent(() => import('./lists.vue'));
const XPages = defineAsyncComponent(() => import('./pages.vue'));
const XRaw = defineAsyncComponent(() => import('./raw.vue'));

const props = withDefaults(defineProps<{
	acct: string;
	page?: string;
}>(), {
	page: 'home',
});

const tab = ref(props.page);

const user = ref<null | Misskey.entities.UserDetailed>(null);
const error = ref<any>(null);

function fetchUser(): void {
	if (props.acct == null) return;
	user.value = null;
	misskeyApi('users/show', Misskey.acct.parse(props.acct)).then(u => {
		user.value = u;
	}).catch(err => {
		error.value = err;
	});
}

watch(() => props.acct, fetchUser, {
	immediate: true,
});

const headerActions = computed(() => []);

const headerTabs = computed(() => {
	if (user.value == null) return [];

	const isReactionsVisible = user.value.publicReactions || ($i && ($i.id === user.value.id || $i.isAdmin || $i.isModerator));
	const isLocalUser = user.value.host === null;

	return [
		{ key: 'home', title: i18n.ts.overview, icon: 'ti ti-home' },
		{ key: 'notes', title: i18n.ts.notes, icon: 'ti ti-pencil' },
		...(isReactionsVisible ? [{ key: 'reactions', title: i18n.ts.reaction, icon: 'ti ti-mood-happy' }] : []),
		...(isLocalUser ? [
			{ key: 'clips', title: i18n.ts.clips, icon: 'ti ti-paperclip' },
			{ key: 'lists', title: i18n.ts.lists, icon: 'ti ti-list' },
			{ key: 'pages', title: i18n.ts.pages, icon: 'ti ti-news' },
		] : []),
		{ key: 'raw', title: 'Raw', icon: 'ti ti-code' },
	];
});

definePageMetadata(() => ({
	title: i18n.ts.user,
	icon: 'ti ti-user',
	...user.value ? {
		title: user.value.name ? `${user.value.name} (@${user.value.username})` : `@${user.value.username}`,
		subtitle: `@${getAcct(user.value)}`,
		userName: user.value,
		avatar: user.value,
		path: `/@${user.value.username}`,
		share: {
			title: user.value.name,
		},
	} : {},
}));
</script>
