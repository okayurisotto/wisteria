<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="$style.root" @click="manuallyHide = 'visible'">
		<ImgWithBlurhash
			:hash="image.blurhash"
			:src="(defaultStore.state.dataSaver.media && hide) ? null : url"
			:forceBlurhash="hide"
			:cover="hide || cover"
			:alt="image.comment || image.name"
			:title="image.comment || image.name"
			:width="image.properties.width"
			:height="image.properties.height"
		/>
		<div :class="$style.indicators">
			<div v-if="['image/gif', 'image/apng'].includes(image.type)" :class="$style.indicator">GIF</div>
			<div v-if="image.comment" :class="$style.indicator">ALT</div>
			<div v-if="image.isSensitive" :class="$style.indicator" style="color: var(--warn)" :title="i18n.ts.sensitive"><i class="ti ti-eye-exclamation"></i></div>
		</div>
		<div v-if="hide" :class="$style.hiddenText">
			<div :class="$style.hiddenTextWrapper">
				<i class="ti ti-photo"></i>
				<span v-if="defaultStore.state.dataSaver.media && image.size">{{ bytes(image.size) }}</span>
				<span>{{ i18n.ts.clickToShow }}</span>
			</div>
		</div>
		<div v-else>
			<button class="_button" :class="$style.menu" @click.stop="showMenu"><i class="ti ti-dots"></i></button>
			<button class="_button" :class="$style.hide" @click.stop="manuallyHide = 'hidden'"><i class="ti ti-eye-off"></i></button>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import * as Misskey from 'misskey-js';
import { getStaticImageUrl } from '@/scripts/media-proxy.js';
import bytes from '@/filters/bytes.js';
import ImgWithBlurhash from '@/components/MkImgWithBlurhash.vue';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { iAmModerator } from '@/account.js';

const props = withDefaults(defineProps<{
	image: Misskey.entities.DriveFile;
	raw?: boolean;
	cover?: boolean;
	disableImageLink?: boolean;
}>(), {
	cover: false,
	disableImageLink: false,
});

const autoHide = computed(() => {
	if (defaultStore.state.nsfw === 'force') return true;
	if (defaultStore.state.dataSaver.media) return true;
	if (props.image.isSensitive && defaultStore.state.nsfw !== 'ignore') return true;
	return false;
});

const manuallyHide = ref<'auto' | 'visible' | 'hidden'>('auto');

const hide = computed(() => {
	switch (manuallyHide.value) {
		case 'auto': return autoHide.value;
		case 'visible': return false;
		case 'hidden': return true;
	}
});

const url = computed(() => {
	if (props.raw || defaultStore.state.loadRawImages) return props.image.url;
	if (defaultStore.state.disableShowingAnimatedImages) return getStaticImageUrl(props.image.url);
	return props.image.thumbnailUrl;
});

const showMenu = async (ev: MouseEvent) => {
	await os.popupMenu([
		{
			text: i18n.ts.hide,
			icon: 'ti ti-eye-off',
			action: () => {
				manuallyHide.value = 'hidden';
			},
		},
		...(iAmModerator ? [{
			text: i18n.ts.markAsSensitive,
			icon: 'ti ti-eye-exclamation',
			danger: true,
			action: () => {
				os.apiWithDialog('drive/files/update', { fileId: props.image.id, isSensitive: true });
			},
		}] : []),
	], ev.currentTarget ?? ev.target);
};
</script>

<style lang="scss" module>
.root {
	--a: var(--bg);
	--b: var(--panel);
	--ratio: 35%;

	position: relative;
	background: var(--a);
	background-image: linear-gradient(-45deg,
		var(--b) calc(  0%                   ), var(--b) calc(  0% + var(--ratio) / 4),
		var(--a) calc(  0% + var(--ratio) / 4), var(--a) calc( 50% - var(--ratio) / 4),
		var(--b) calc( 50% - var(--ratio) / 4), var(--b) calc( 50% + var(--ratio) / 4),
		var(--a) calc( 50% + var(--ratio) / 4), var(--a) calc(100% - var(--ratio) / 4),
		var(--b) calc(100% - var(--ratio) / 4), var(--b) calc(100%                   ),
	);
	background-size: 24px 24px;
}

.hiddenText {
	align-items: center;
	cursor: pointer;
	display: flex;
	inset: 0;
	justify-content: center;
	position: absolute;
}

.hiddenTextWrapper {
	align-items: center;
	background-color: var(--panel);
	border-radius: var(--rounded);
	color: var(--fg);
	display: flex;
	font-size: 0.8em;
	gap: calc(var(--margin-half) / 2);
	padding: var(--margin-half);
	text-align: center;
}

.hide,
.menu {
	--size: 28px;

	align-items: center;
	background-color: var(--panel);
	border-radius: var(--rounded-full);
	color: var(--fg);
	display: flex;
	font-size: calc(var(--size) / 5 * 2);
	height: var(--size);
	justify-content: center;
	padding: var(--margin-half);
	position: absolute;
	width: var(--size);
}

.hide {
	right: var(--margin-half);
	top: var(--margin-half);
}

.menu {
	bottom: var(--margin-half);
	right: var(--margin-half);
}

.imageContainer {
	display: block;
	overflow: hidden;
	width: 100%;
	height: 100%;
	background-position: center;
	background-size: contain;
	background-repeat: no-repeat;
}

.indicators {
	display: flex;
	gap: calc(var(--margin-half) / 2);
	left: var(--margin-half);
	position: absolute;
	top: var(--margin-half);
}

.indicator {
	background-color: var(--panel);
	border-radius: var(--rounded);
	color: var(--fg);
	font-size: 0.8em;
	font-weight: bold;
	padding: 2px 5px;
}
</style>
