<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="[$style.root, { [$style.cover]: cover }]" :title="title ?? ''" :style="{ background: props.forceBlurhash ? avgColor : 'unset' }">
		<img v-show="!props.forceBlurhash" :class="$style.img" :src="src ?? undefined" :alt="alt ?? undefined" loading="eager" decoding="async" />
	</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { extractAvgColorFromBlurhash } from '@/scripts/extract-avg-color-from-blurhash.js';

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

const avgColor = computed(() => {
	if (props.hash == null) return;
	return extractAvgColorFromBlurhash(props.hash) ?? '#888';
});
</script>

<style module>
.root {
	width: 100%;
	height: 100%;

}

.root.cover>.img {
	object-fit: cover;
}

.img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}
</style>
