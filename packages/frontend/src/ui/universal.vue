<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.iconOnly]: iconOnly }]">
	<XSidebar :class="$style.sidebar"/>

	<MkStickyContainer ref="contents" :class="$style.contents" style="container-type: inline-size;" @contextmenu.stop="onContextmenu">
		<template #header>
			<div>
				<XAnnouncements v-if="$i"/>
				<XStatusBars :class="$style.statusbars"/>
			</div>
		</template>
		<RouterView/>
		<div :class="$style.spacer"></div>
	</MkStickyContainer>

	<XWidgets :class="$style.widgets"/>

	<button :class="$style.widgetButton" class="_button" @click="widgetsShowing = true"><i class="ti ti-apps"></i></button>

	<div ref="navFooter" :class="$style.nav">
		<button :class="[$style.navButton, { [$style.indicate]: menuIndicated }]" class="_button" @click="drawerMenuShowing = true">
			<i :class="$style.navButtonIcon" class="ti ti-menu-2"></i>
		</button>
		<button :class="$style.navButton" class="_button" @click="isRoot ? top() : mainRouter.push('/')">
			<i :class="$style.navButtonIcon" class="ti ti-home"></i>
		</button>
		<button :class="[$style.navButton, $style.postButton]" class="_button" @click="os.post()">
			<i :class="$style.navButtonIcon" class="ti ti-pencil"></i>
		</button>
		<button :class="[$style.navButton, { [$style.indicate]: $i?.hasUnreadNotification }]" class="_button" @click="mainRouter.push('/my/notifications')">
			<i :class="$style.navButtonIcon" class="ti ti-bell"></i>
		</button>
		<button :class="$style.navButton" class="_button" @click="widgetsShowing = true">
			<i :class="$style.navButtonIcon" class="ti ti-apps"></i>
		</button>
	</div>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_leaveTo : ''"
	>
		<div
			v-if="drawerMenuShowing"
			:class="$style.menuDrawerBg"
			class="_modalBg"
			@click="drawerMenuShowing = false"
			@touchstart.passive="drawerMenuShowing = false"
		></div>
	</Transition>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_menuDrawer_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_menuDrawer_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_menuDrawer_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_menuDrawer_leaveTo : ''"
	>
		<div v-if="drawerMenuShowing" :class="$style.menuDrawer">
			<XSidebar/>
		</div>
	</Transition>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_widgetsDrawerBg_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_widgetsDrawerBg_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_widgetsDrawerBg_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_widgetsDrawerBg_leaveTo : ''"
	>
		<div
			v-if="widgetsShowing"
			:class="$style.widgetsDrawerBg"
			class="_modalBg"
			@click="widgetsShowing = false"
			@touchstart.passive="widgetsShowing = false"
		></div>
	</Transition>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_widgetsDrawer_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_widgetsDrawer_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_widgetsDrawer_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_widgetsDrawer_leaveTo : ''"
	>
		<div v-if="widgetsShowing" :class="$style.widgetsDrawer">
			<button class="_button" :class="$style.widgetsCloseButton" @click="widgetsShowing = false"><i class="ti ti-x"></i></button>
			<XWidgets/>
		</div>
	</Transition>

	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { provide, onMounted, computed, ref, watch, shallowRef, type Ref, onBeforeUnmount } from 'vue';
import XWidgets from './universal.widgets.vue';
import XCommon from './_common_/common.vue';
import XSidebar from './_common_/navbar.vue';
import XStatusBars from './_common_/statusbars.vue';
import XAnnouncements from './_common_/announcements.vue';
import type MkStickyContainer from '@/components/global/MkStickyContainer.vue';
import { instanceName } from '@/config.js';
import * as os from '@/os.js';
import { defaultStore } from '@/store.js';
import { navbarItemDef } from '@/navbar.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';
import { type PageMetadata, provideMetadataReceiver, provideReactiveMetadata } from '@/scripts/page-metadata.js';
import { CURRENT_STICKY_BOTTOM } from '@/const.js';
import { useScrollPositionManager } from '@/nirax.js';
import { mainRouter } from '@/router/main.js';
import { useMediaQuery } from '@vueuse/core';

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const pageMetadata = ref<null | PageMetadata>(null);
const widgetsShowing = ref(false);
const navFooter = shallowRef<HTMLElement>();
const contents = shallowRef<InstanceType<typeof MkStickyContainer>>();

provide('router', mainRouter);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
	if (pageMetadata.value) {
		if (isRoot.value && pageMetadata.value.title === instanceName) {
			document.title = pageMetadata.value.title;
		} else {
			document.title = `${pageMetadata.value.title} | ${instanceName}`;
		}
	}
});
provideReactiveMetadata(pageMetadata);

const menuIndicated = computed(() => {
	return Object.entries(navbarItemDef)
		.filter(([def]) => def !== 'notifications') // 通知は下にボタンとして表示されているため無視
		.some(([, item]) => 'indicated' in item && item.indicated)
});

const drawerMenuShowing = ref(false);

mainRouter.on('change', () => {
	drawerMenuShowing.value = false;
});

defaultStore.loaded.then(() => {
	if (defaultStore.state.widgets.length === 0) {
		defaultStore.set('widgets', [
			{
				name: 'calendar',
				id: 'a', place: 'right', data: {},
			},
			{
				name: 'notifications',
				id: 'b', place: 'right', data: {},
			},
		]);
	}
});

const onContextmenu = (ev: MouseEvent) => {
	if (!(ev.target instanceof HTMLElement)) return;
	if (ev.target.closest('a') !== null) return;
	if (['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes(ev.target.tagName)) return;
	if (ev.target.hasAttribute('contenteditable')) return; // TODO: `false`や空文字列の扱いを考慮する
	if (window.getSelection()?.toString() !== '') return;

	const path = mainRouter.getCurrentPath();
	os.contextMenu([{
		type: 'label',
		text: path,
	}, {
		icon: 'ti ti-window-maximize',
		text: i18n.ts.openInWindow,
		action: () => {
			os.pageWindow(path);
		},
	}], ev);
};

const top = () => {
	contents.value?.rootEl?.scrollTo({
		top: 0,
		behavior: 'smooth',
	});
};

const navFooterHeight = ref(0);
provide<Ref<number>>(CURRENT_STICKY_BOTTOM, navFooterHeight);

const isNavFooterVisible = useMediaQuery('(width < 500px)');

watch([navFooter, isNavFooterVisible], () => {
	if (navFooter.value === undefined) return;

	if (isNavFooterVisible.value) {
		navFooterHeight.value = navFooter.value.offsetHeight;
		document.body.style.setProperty('--stickyBottom', `${navFooterHeight.value}px`);
		document.body.style.setProperty('--minBottomSpacing', 'var(--minBottomSpacingMobile)');
	} else {
		navFooterHeight.value = 0;
		document.body.style.setProperty('--stickyBottom', '0px');
		document.body.style.setProperty('--minBottomSpacing', '0px');
	}
});

useScrollPositionManager(() => contents.value?.rootEl ?? null, mainRouter);

// #region iconOnly

const iconOnly = ref(false);

const calcViewState = () => {
	iconOnly.value = defaultStore.state.menuDisplay === 'sideIcon';
};

calcViewState();

watch(defaultStore.reactiveState.menuDisplay, () => {
	calcViewState();
});

// #endregion

//#region clock

const now = ref(new Date());
provide<Ref<Date>>('now', now);
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
	timer = setInterval(() => {
		now.value = new Date();
	}, 1000);
});

onBeforeUnmount(() => {
	if (timer !== null) clearInterval(timer);
});

//#endregion
</script>

<style lang="scss" module>
//#region Transitions

.transition_menuDrawerBg_enterActive,
.transition_menuDrawerBg_leaveActive {
	opacity: 1;
	transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_menuDrawerBg_enterFrom,
.transition_menuDrawerBg_leaveTo {
	opacity: 0;
}

.transition_menuDrawer_enterActive,
.transition_menuDrawer_leaveActive {
	opacity: 1;
	transform: translateX(0);
	transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_menuDrawer_enterFrom,
.transition_menuDrawer_leaveTo {
	opacity: 0;
	transform: translateX(-240px);
}

.transition_widgetsDrawerBg_enterActive,
.transition_widgetsDrawerBg_leaveActive {
	opacity: 1;
	transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_widgetsDrawerBg_enterFrom,
.transition_widgetsDrawerBg_leaveTo {
	opacity: 0;
}

.transition_widgetsDrawer_enterActive,
.transition_widgetsDrawer_leaveActive {
	opacity: 1;
	transform: translateX(0);
	transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_widgetsDrawer_enterFrom,
.transition_widgetsDrawer_leaveTo {
	opacity: 0;
	transform: translateX(240px);
}

//#endregion

.root {
	--sidebar-width: 250px;
	--widgets-width: 350px;

	box-sizing: border-box;
	display: flex;
	max-height: 100dvh;

	&.iconOnly {
		--sidebar-width: 80px;
	}
}

.sidebar {
	width: var(--sidebar-width);
}

.contents {
	border-right: solid 0.5px var(--divider);
	flex: 1;
	overflow-y: scroll;
}

.widgets {
	box-sizing: border-box;
	overflow-y: scroll;
	padding: var(--margin) var(--margin) calc(var(--margin) + env(safe-area-inset-bottom, 0px));
	width: var(--widgets-width);
}

.widgetButton {
	display: none; // block

	background: var(--panel);
	border-radius: var(--rounded-full);
	bottom: 32px;
	box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
	font-size: 22px;
	height: 64px;
	position: fixed;
	right: 32px;
	width: 64px;
	z-index: 1000;
}

.widgetsDrawerBg {
	z-index: 1001;
}

.widgetsDrawer {
	position: fixed;
	top: 0;
	right: 0;
	z-index: 1001;
	width: 310px;
	height: 100dvh;
	padding: var(--margin) var(--margin) calc(var(--margin) + env(safe-area-inset-bottom, 0px)) !important;
	box-sizing: border-box;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--bg);
	max-width: 100dvw;
}

.widgetsCloseButton {
	display: none; // block

	padding: 8px;
	margin: 0 auto;
}

.nav {
	display: none; // flex

	position: fixed;
	z-index: 1000;
	bottom: 0;
	left: 0;
	padding: var(--margin) var(--margin) max(var(--margin), env(safe-area-inset-bottom, 0px)) var(--margin);
	justify-content: space-around;
	gap: var(--margin);
	width: 100%;
	box-sizing: border-box;
	background-color: var(--bg);
}

.navButton {
	align-items: center;
	background: var(--panel);
	border-radius: var(--rounded-full);
	color: var(--fg);
	display: flex;
	flex: 0 0 4rem;
	height: 4rem;
	justify-content: center;
	position: relative;

	&.indicate::before {
		content: "";

		animation: blinking 1s infinite;
		background-color: var(--indicator);
		border-radius: var(--rounded-full);
		height: .8rem;
		position: absolute;
		right: 0;
		top: 0;
		width: .8rem;
		z-index: 100;
	}
}

@keyframes blinking {
	0% { opacity: 1; transform: scale(1); }
	20% { opacity: 1; transform: scale(1); }
	90% { opacity: 0; transform: scale(0.3); }
}

.postButton {
	background: linear-gradient(90deg, var(--buttonGradateA), var(--buttonGradateB));
	color: var(--fgOnAccent);
}

.navButtonIcon {
	font-size: 1.2rem;
}

.menuDrawerBg {
	z-index: 1001;
}

.menuDrawer {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 1001;
	height: 100dvh;
	width: 250px;
	box-sizing: border-box;
	contain: strict;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--panel);
}

.statusbars {
	position: sticky;
	top: 0;
	left: 0;
}

.spacer {
	height: var(--minBottomSpacing);
}

@media (width < 1280px) {
	.root {
		--sidebar-width: 80px;
	}
}

@media (width < 1100px) {
	.root {
		--widgets-width: 0;
	}

	.widgets {
		display: none;
	}

	.widgetButton {
		display: block;
	}
}

@media (width < 500px) {
	.root {
		--sidebar-width: 0 !important;
	}

	.sidebar {
		display: none;
	}

	.widgetButton {
		display: none;
	}

	.nav {
		display: flex;
	}
}

@media (width < 370px) {
	.widgetsCloseButton {
		display: block;
	}
}
</style>
