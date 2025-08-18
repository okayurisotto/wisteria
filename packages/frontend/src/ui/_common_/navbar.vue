<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.body">
		<div :class="$style.top">
			<div :class="$style.banner" :style="{ backgroundImage: `url(${ instance.bannerUrl })` }"></div>
			<button v-tooltip.noDelay.right="instance.name ?? i18n.ts.instance" class="_button" :class="$style.instance" @click="openInstanceMenu">
				<img :src="instance.iconUrl || instance.faviconUrl || '/favicon.ico'" alt="" :class="$style.instanceIcon"/>
			</button>
		</div>
		<div :class="$style.middle">
			<MkA v-tooltip.noDelay.right="i18n.ts.timeline" :class="$style.item" :activeClass="$style.active" to="/" exact>
				<i :class="$style.itemIcon" class="ti ti-home ti-fw"></i><span :class="$style.itemText">{{ i18n.ts.timeline }}</span>
			</MkA>
			<template v-for="item in menu">
				<div v-if="item === '-'" :class="$style.divider"></div>
				<component
					:is="navbarItemDef[item].to ? 'MkA' : 'button'"
					v-else-if="navbarItemDef[item] && (navbarItemDef[item].show !== false)"
					v-tooltip.noDelay.right="navbarItemDef[item].title"
					class="_button"
					:class="[$style.item, { [$style.active]: navbarItemDef[item].active }]"
					:activeClass="$style.active"
					:to="navbarItemDef[item].to"
					v-on="navbarItemDef[item].action ? { click: navbarItemDef[item].action } : {}"
				>
					<i class="ti-fw" :class="[$style.itemIcon, navbarItemDef[item].icon]"></i><span :class="$style.itemText">{{ navbarItemDef[item].title }}</span>
					<span v-if="navbarItemDef[item].indicated" :class="$style.itemIndicator">
						<span v-if="navbarItemDef[item].indicateValue" class="_indicateCounter" :class="$style.itemIndicateValueIcon">{{ navbarItemDef[item].indicateValue }}</span>
						<i v-else class="_indicatorCircle"></i>
					</span>
				</component>
			</template>
			<div :class="$style.divider"></div>
			<MkA v-if="$i.isAdmin || $i.isModerator" v-tooltip.noDelay.right="i18n.ts.controlPanel" :class="$style.item" :activeClass="$style.active" to="/admin">
				<i :class="$style.itemIcon" class="ti ti-dashboard ti-fw"></i><span :class="$style.itemText">{{ i18n.ts.controlPanel }}</span>
			</MkA>
			<button class="_button" :class="$style.item" @click="more">
				<i :class="$style.itemIcon" class="ti ti-grid-dots ti-fw"></i><span :class="$style.itemText">{{ i18n.ts.more }}</span>
				<span v-if="otherMenuItemIndicated" :class="$style.itemIndicator"><i class="_indicatorCircle"></i></span>
			</button>
			<MkA v-tooltip.noDelay.right="i18n.ts.settings" :class="$style.item" :activeClass="$style.active" to="/settings">
				<i :class="$style.itemIcon" class="ti ti-settings ti-fw"></i><span :class="$style.itemText">{{ i18n.ts.settings }}</span>
			</MkA>
		</div>
		<div :class="$style.bottom">
			<button v-tooltip.noDelay.right="i18n.ts.note" class="_button" :class="[$style.post]" @click="os.post">
				<i class="ti ti-pencil ti-fw" :class="$style.postIcon"></i><span :class="$style.postText">{{ i18n.ts.note }}</span>
			</button>
			<MkA v-if="$i" :class="$style.account" :to="`/@${$i.username}`">
				<MkAvatar :user="$i" :class="$style.avatar"/><MkAcct class="_nowrap" :class="$style.acct" :user="$i"/>
			</MkA>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { openInstanceMenu } from './common.js';
import * as os from '@/os.js';
import { navbarItemDef } from '@/navbar.js';
import { $i } from '@/account.js';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';

const menu = computed(() => defaultStore.state.menu);
const otherMenuItemIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (menu.value.includes(def)) continue;
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

function more(ev: MouseEvent) {
	os.popup(defineAsyncComponent(() => import('@/components/MkLaunchPad.vue')), {
		src: ev.currentTarget ?? ev.target,
	}, {
	}, 'closed');
}
</script>

<style lang="scss" module>
/**
 * このコンポーネントは、親要素によって`width: 80px`か`width: 250px`が指定されることを期待しています。
 * 80pxではアイコンのみ表示され、250pxではアイコンとそのラベルが表示されます。
 * それ以外の幅が指定された場合、レイアウトが崩れないことは保証されません。
 */

.root {
	container-type: inline-size;
}

.body {
	--divider-border-width: 0.1em;
	--icon-size: 2em;
	--indicator-size: 0.5em;
	--instance-icon-size: 2.5em;
	--item-children-gap: 0.5em;
	--item-height: 3em;
	--item-padding-inline: 0.75em;
	--item-width: min(100%, 250px);
	--navbar-children-gap: 1.5em;
	--navbar-padding-block: 1.5em;
	--navbar-padding-inline: 1em;

	--divider-height: var(--item-height);
	--divider-margin-inline: calc((100% - var(--item-width)) / 2 + var(--item-padding-inline));

	background: var(--navBg);
	box-sizing: border-box;
	contain: strict;
	display: flex;
	flex-direction: column;
	height: 100dvh;
	overflow-x: clip;
	overflow-y: auto;
	overscroll-behavior: contain;
	width: 100%;
	z-index: 1001;
}

.top {
	-webkit-backdrop-filter: var(--blur, blur(8px));
	backdrop-filter: var(--blur, blur(8px));
	background: var(--X14);
	padding-block: var(--navbar-padding-block) var(--navbar-children-gap);
	position: sticky;
	top: 0;
	z-index: 1;
}

.banner {
	-webkit-mask-image: linear-gradient(0deg, rgba(0,0,0,0) 15%, rgba(0,0,0,0.75) 100%);
	background-position: center center;
	background-size: cover;
	height: 100%;
	left: 0;
	mask-image: linear-gradient(0deg, rgba(0,0,0,0) 15%, rgba(0,0,0,0.75) 100%);
	position: absolute;
	top: 0;
	width: 100%;
}

.instance {
	display: block;
	position: relative;
	text-align: center;
	width: 100%;
}

.instanceIcon {
	aspect-ratio: 1;
	display: inline-block;
	width: var(--instance-icon-size);
}

.bottom {
	-webkit-backdrop-filter: var(--blur, blur(8px));
	align-items: center;
	backdrop-filter: var(--blur, blur(8px));
	background: var(--X14);
	bottom: 0;
	display: flex;
	flex-direction: column;
	padding-block: var(--navbar-children-gap) var(--navbar-padding-block);
	padding-inline: var(--navbar-padding-inline);
	position: sticky;
}

.post {
	align-items: center;
	background: linear-gradient(90deg, var(--buttonGradateA), var(--buttonGradateB));
	border-radius: var(--rounded-full);
	color: var(--fgOnAccent);
	display: flex;
	font-weight: bold;
	gap: var(--item-children-gap);
	height: var(--item-height);
	padding-inline: var(--item-padding-inline);
	position: relative;
	text-align: left;
	width: var(--item-width);

	&:hover, &.active {
		background: var(--accentLighten);
	}
}

.postIcon {
	width: var(--icon-size);
}

.account {
	align-items: center;
	box-sizing: border-box;
	display: flex;
	gap: var(--item-children-gap);
	overflow: clip;
	padding-block-start: var(--navbar-children-gap);
	padding-inline: var(--item-padding-inline);
	text-align: left;
	width: var(--item-width);
}

.avatar {
	aspect-ratio: 1;
	flex-shrink: 0;
	width: var(--icon-size);
}

.acct {
	display: block;
	flex-shrink: 1;
}

.middle {
	align-items: center;
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	padding-inline: var(--navbar-padding-inline);
}

.divider {
	border-block: calc(var(--divider-border-width) / 2) solid var(--divider);
	box-sizing: border-box;
	margin-block: calc((var(--divider-height) - var(--divider-border-width)) / 2);
	margin-inline: var(--divider-margin-inline);
	width: calc(100% - var(--divider-margin-inline) * 2);
}

.item {
	align-items: center;
	border-radius: var(--rounded-full);
	box-sizing: border-box;
	color: var(--navFg);
	display: flex;
	gap: var(--item-children-gap);
	height: var(--item-height);
	line-height: 2.85rem;
	padding-inline: var(--item-padding-inline);
	position: relative;
	text-align: left;
	width: var(--item-width);

	&:hover {
		color: var(--navHoverFg);
		text-decoration: none;
	}

	&.active {
		background: var(--accentedBg);
		color: var(--navActive);
	}

	&:hover, &.active {
		color: var(--accent);
	}
}

.itemIcon {
	min-width: var(--icon-size);
	position: relative;
	width: var(--icon-size);
}

.itemIndicator {
	animation: global-blink 1s infinite;
	color: var(--navIndicator);
	font-size: var(--indicator-size);
	left: calc(var(--indicator-size) / -2);
	position: absolute;
	top: 0;

	&:has(.itemIndicateValueIcon) {
		align-items: center;
		animation: none;
		display: flex;
		font-size: 0.6em;
		height: 100%;
		left: auto;
		right: 0;
	}
}

.itemText {
	font-size: 0.9em;
	overflow-x: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// 期待される幅（80pxもしくは250px）のちょうど中間の幅で変化
// 165px = (80px + 250px) / 2
@container (width < 165px) {
	.body {
		--divider-height: 2em;
		--divider-margin-inline: calc(50% - var(--item-height) / 2);
		--icon-size: 2.75em;
		--instance-icon-size: 2.25em;
		--item-height: 3.5em;
		--item-padding-inline: 0;
		--navbar-padding-inline: 0;
	}

	.middle, .bottom {
		align-items: center;
	}

	.item,
	.post,
	.account {
		justify-content: center;
		width: var(--item-height);
	}

	.itemText, .postText, .acct {
		display: none;
	}
}
</style>
