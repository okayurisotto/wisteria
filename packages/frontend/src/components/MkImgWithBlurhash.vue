<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div ref="root" :class="[$style.root, { [$style.cover]: cover }]" :title="title ?? ''">
		<span v-show="props.forceBlurhash" :class="$style.avgColor"
			:style="{ background: avgColor, width: imgWidth + 'px', height: imgHeight + 'px' }"></span>
		<img v-show="!props.forceBlurhash" :class="$style.img" :height="imgHeight" :width="imgWidth" :src="src ?? undefined"
			:alt="alt ?? undefined" loading="eager" decoding="async" />
	</div>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
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

const imgWidth = computed(() => {
	return rootSize.width.value ?? 300
});

const imgHeight = computed(() => {
	const ratio = props.width / props.height;
	return Math.round(imgWidth.value / ratio);
});

const avgColor = computed(() => {
	if (props.hash == null) return;
	return extractAvgColorFromBlurhash(props.hash) ?? '#888';
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
	display: block;
}
</style>
