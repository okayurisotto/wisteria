<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div style="container-type: inline-size;">
		<RouterView/>
	</div>

	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, provide, type Ref, ref } from 'vue';
import XCommon from './_common_/common.vue';
import { type PageMetadata, provideMetadataReceiver, provideReactiveMetadata } from '@/scripts/page-metadata.js';
import { instanceName } from '@/config.js';
import { mainRouter } from '@/router/main.js';

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const pageMetadata = ref<null | PageMetadata>(null);

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

document.documentElement.style.overflowY = 'scroll';

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
.root {
	min-height: 100dvh;
	box-sizing: border-box;
}

.bottom {
	height: calc(60px + (var(--margin) * 2) + env(safe-area-inset-bottom, 0px));
	width: 100%;
	margin-top: auto;
}

.button {
	position: fixed !important;
	padding: 0;
	aspect-ratio: 1;
	width: 100%;
	max-width: 60px;
	margin: auto;
	border-radius: var(--rounded-full);
	background: var(--panel);
	color: var(--fg);
	right: var(--margin);
	bottom: calc(var(--margin) + env(safe-area-inset-bottom, 0px));
}
</style>
