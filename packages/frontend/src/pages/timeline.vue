<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="src" :actions="headerActions" :tabs="$i ? headerTabs : []"/></template>
	<MkSpacer :contentMax="800">
		<MkHorizontalSwipe v-if="src !== null" v-model:tab="src" :tabs="$i ? headerTabs : []">
			<div :key="src" ref="rootEl" v-hotkey.global="keymap">
				<MkPostForm v-if="defaultStore.reactiveState.showFixedPostForm.value" :class="$style.postForm" class="post-form _panel" fixed style="margin-bottom: var(--margin);"/>
				<div v-if="queue > 0" :class="$style.new"><button class="_buttonPrimary" :class="$style.newButton" @click="top()">{{ i18n.ts.newNoteRecived }}</button></div>
				<div :class="$style.tl">
					<MkTimeline
						ref="tlComponent"
						:key="src + withRenotes + withReplies + onlyFiles"
						:src="src.split(':')[0]"
						:list="src.split(':')[1]"
						:withRenotes="withRenotes"
						:withReplies="withReplies"
						:onlyFiles="onlyFiles"
						:sound="true"
						@queue="queueUpdated"
					/>
				</div>
			</div>
		</MkHorizontalSwipe>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, watch, provide, ref, useTemplateRef } from 'vue';
import type { Tab } from '@/components/global/MkPageHeader.tabs.vue';
import MkTimeline from '@/components/MkTimeline.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import MkHorizontalSwipe from '@/components/MkHorizontalSwipe.vue';
import { scroll } from '@/scripts/scroll.js';
import * as os from '@/os.js';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { antennasCache, userListsCache } from '@/cache.js';
import { deviceKind } from '@/scripts/device-kind.js';
import { deepMerge } from '@/scripts/merge.js';
import type { MenuItem } from '@/types/menu.js';
import { useRouter } from '@/router/supplier';

provide('shouldOmitHeaderTitle', true);

const router = useRouter();
const userLists = await userListsCache.fetch();
const antennas = await antennasCache.fetch();

const keymap = {
	't': focus,
};

const rootEl = useTemplateRef('rootEl');
const tlComponent = useTemplateRef('tlComponent');

const queue = ref(0);
const src = computed<'home' | `list:${string}` | null>({
	get: () => ($i ? defaultStore.reactiveState.tl.value.src : null),
	set: (x) => saveSrc(x ?? 'home'),
});
const withRenotes = computed<boolean>({
	get: () => defaultStore.reactiveState.tl.value.filter.withRenotes,
	set: (x) => saveTlFilter('withRenotes', x),
});

// computed内での無限ループを防ぐためのフラグ
const localSocialTLFilterSwitchStore = ref<'withReplies' | 'onlyFiles' | false>('withReplies');

const withReplies = computed<boolean>({
	get: () => {
		if ($i === null) return false;
		return defaultStore.reactiveState.tl.value.filter.withReplies;
	},
	set: (x) => saveTlFilter('withReplies', x),
});
const onlyFiles = computed<boolean>({
	get: () => defaultStore.reactiveState.tl.value.filter.onlyFiles,
	set: (x) => saveTlFilter('onlyFiles', x),
});

watch([withReplies, onlyFiles], ([withRepliesTo, onlyFilesTo]) => {
	if (withRepliesTo) {
		localSocialTLFilterSwitchStore.value = 'withReplies';
	} else if (onlyFilesTo) {
		localSocialTLFilterSwitchStore.value = 'onlyFiles';
	} else {
		localSocialTLFilterSwitchStore.value = false;
	}
});

const withSensitive = computed<boolean>({
	get: () => defaultStore.reactiveState.tl.value.filter.withSensitive,
	set: (x) => saveTlFilter('withSensitive', x),
});

watch(src, () => {
	queue.value = 0;
});

watch(withSensitive, () => {
	// これだけはクライアント側で完結する処理なので手動でリロード
	tlComponent.value?.reloadTimeline();
});

function queueUpdated(q: number): void {
	queue.value = q;
}

function top(): void {
	if (rootEl.value) scroll(rootEl.value, { top: 0 });
}

async function chooseList(ev: MouseEvent): Promise<void> {
	if (userLists.length === 1) {
		router.push(`/timeline/list/${userLists[0]!.id}`);
		return;
	}

	const items: MenuItem[] = userLists.map(list => ({
		type: 'link' as const,
		text: list.name,
		to: `/timeline/list/${list.id}`,
	}));
	os.popupMenu(items, ev.currentTarget ?? ev.target);
}

async function chooseAntenna(ev: MouseEvent): Promise<void> {
	if (antennas.length === 1) {
		router.push(`/timeline/antenna/${antennas[0]!.id}`);
		return;
	}

	const items: MenuItem[] = antennas.map(antenna => ({
		type: 'link' as const,
		text: antenna.name,
		indicate: antenna.hasUnreadNote ?? false,
		to: `/timeline/antenna/${antenna.id}`,
	}));
	os.popupMenu(items, ev.currentTarget ?? ev.target);
}

function saveSrc(newSrc: 'home' | `list:${string}`): void {
	const out = deepMerge({ src: newSrc }, defaultStore.state.tl);

	if (newSrc.startsWith('userList:')) {
		const id = newSrc.substring('userList:'.length);
		out.userList = defaultStore.reactiveState.pinnedUserLists.value.find(l => l.id === id) ?? null;
	}

	defaultStore.set('tl', out);
}

function saveTlFilter(key: keyof typeof defaultStore.state.tl.filter, newValue: boolean) {
	if (key !== 'withReplies' || $i) {
		const out = deepMerge({ filter: { [key]: newValue } }, defaultStore.state.tl);
		defaultStore.set('tl', out);
	}
}

function focus(): void {
	tlComponent.value?.focus();
}

const headerActions = computed(() => {
	const tmp = [
		{
			icon: 'ti ti-dots',
			text: i18n.ts.options,
			handler: (ev: Event) => {
				os.popupMenu([{
					type: 'switch',
					text: i18n.ts.showRenotes,
					ref: withRenotes,
				}, {
					type: 'switch',
					text: i18n.ts.withSensitive,
					ref: withSensitive,
				}, {
					type: 'switch',
					text: i18n.ts.fileAttachedOnly,
					ref: onlyFiles,
				}], ev.currentTarget ?? ev.target);
			},
		},
	];
	if (deviceKind === 'desktop') {
		tmp.unshift({
			icon: 'ti ti-refresh',
			text: i18n.ts.reload,
			handler: () => {
				tlComponent.value?.reloadTimeline();
			},
		});
	}
	return tmp;
});

const headerTabs = computed(() => [...(defaultStore.reactiveState.pinnedUserLists.value.map(l => ({
	key: 'list:' + l.id,
	title: l.name,
	icon: 'ti ti-star',
	iconOnly: true,
}))), {
	key: 'home',
	title: i18n.ts._timelines.home,
	icon: 'ti ti-home',
	iconOnly: true,
}, ...(userLists.length > 0 ? [{
	icon: 'ti ti-list',
	title: i18n.ts.lists,
	iconOnly: true,
	onClick: chooseList,
}] : []), ...(antennas.length > 0 ? [{
	icon: 'ti ti-antenna',
	title: i18n.ts.antennas,
	iconOnly: true,
	onClick: chooseAntenna,
}] : [])] as Tab[]);

definePageMetadata(() => ({
	title: i18n.ts.timeline,
	icon: 'ti ti-home',
}));
</script>

<style lang="scss" module>
.new {
	position: sticky;
	top: calc(var(--stickyTop, 0px) + 16px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--margin));
	}
}

.newButton {
	display: block;
	margin: var(--margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: var(--rounded-full);
}

.postForm {
	border-radius: var(--rounded);
}

.tl {
	background: var(--bg);
	border-radius: var(--rounded);
	overflow: clip;
}
</style>
