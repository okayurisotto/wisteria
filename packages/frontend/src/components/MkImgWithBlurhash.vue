<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div ref="root" :class="[$style.root, { [$style.cover]: cover }]" :title="title ?? ''">
		<span v-show="props.forceBlurhash" :class="$style.avgColor" :style="{ background: avgColor }"></span>
		<img v-show="!props.forceBlurhash" :class="$style.img" :height="imgHeight" :width="imgWidth" :src="src ?? undefined"
			:alt="alt ?? undefined" loading="eager" decoding="async" />
	</div>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, watch } from 'vue';
import { extractAvgColorFromBlurhash } from '@/scripts/extract-avg-color-from-blurhash.js';
import { useElementSize } from '@vueuse/core';

const props = withDefaults(defineProps<{
	src?: string | null;
	hash?: string | null;
	alt?: string | null;
	title?: string | null;
	height?: number;
	width?: number;
	cover?: boolean;
	forceBlurhash?: boolean;
}>(), {
	src: null,
	alt: '',
	title: null,
	height: 64,
	width: 64,
	cover: true,
	forceBlurhash: false,
});

const root = useTemplateRef('root');
const rootSize = useElementSize(root);

const aspectRatio = computed(() => props.width / props.height);

const imgWidth = computed(() => rootSize.width.value ?? 300);

const imgHeight = computed(() => Math.round(imgWidth.value / aspectRatio.value));

const avgColor = computed(() => {
	if (props.hash == null) return;
	return extractAvgColorFromBlurhash(props.hash) ?? '#888';
});

watch([root, aspectRatio], () => {
	if (root.value) {
		root.value.style.setProperty('--aspect-ratio', `${Math.round(aspectRatio.value * 100) / 100}`);
	}
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	width: 100%;
	height: 100%;

	&.cover {
		>.img {
			object-fit: cover;
		}
	}
}

.img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.avgColor {
	aspect-ratio: var(--aspect-ratio);
	display: block;
	margin-inline: auto;
	max-height: 100%;
	max-width: 100%;
}
</style>
