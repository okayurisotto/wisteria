<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	ref="el"
	class="_shadow"
	:class="$style.root"
	:style="{
		left: floatingPosition?.left + 'px',
		top: floatingPosition?.top + 'px',
		maxWidth: floatingPosition?.maxWidth + 'px',
		maxHeight: floatingPosition?.maxHeight + 'px',
	}"
>
	<MkMenu :items="items" :align="align" :width="width" :asDrawer="false" @close="onChildClosed"/>
</div>
</template>

<script lang="ts" setup>
import { computed, shallowRef } from 'vue';
import MkMenu from './MkMenu.vue';
import type { MenuItem } from '@/types/menu.js';
import { getFloatingPosition } from '@/scripts/getFloatingPosition';
import { useWindowSize } from '@vueuse/core';

const props = defineProps<{
	items: MenuItem[];
	targetElement: HTMLElement;
	rootElement: HTMLElement;
	width?: number;
	viaKeyboard?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'actioned'): void;
}>();

const el = shallowRef<HTMLElement>();
const windowSize = useWindowSize();

const align = 'left';
const BUTTON_PADDING = 8;
const SCROLLBAR_THICKNESS = 16;

const floatingPosition = computed(() => {
	if (el.value == null) return;

	const parentRect = props.targetElement.getBoundingClientRect();
	const contentRect = el.value.getBoundingClientRect();

	const left = getFloatingPosition({
		contentAlignment: 'positive',
		contentSize: contentRect.width,
		target: parentRect.x,
		targetSize: parentRect.width,
		viewportMargin: SCROLLBAR_THICKNESS,
		viewportSize: windowSize.width.value,
		clipBasedOnTarget: false,
	});

	const top = getFloatingPosition({
		contentAlignment: 'positive',
		contentSize: contentRect.height,
		target: parentRect.y - BUTTON_PADDING,
		targetSize: parentRect.height + BUTTON_PADDING * 2,
		viewportMargin: SCROLLBAR_THICKNESS,
		viewportSize: windowSize.height.value,
		mode: 'overlap',
		clipBasedOnTarget: false,
	});

	return {
		left: left.value,
		top: top.value,
		maxWidth: left.maxLength,
		maxHeight: top.maxLength,
	};
});

function onChildClosed(actioned?: boolean) {
	if (actioned) {
		emit('actioned');
	} else {
		emit('closed');
	}
}

defineExpose({
	checkHit: (ev: MouseEvent) => {
		return (ev.target === el.value || el.value?.contains(ev.target as Node));
	},
});
</script>

<style lang="scss" module>
.root {
	position: fixed;
	overflow: scroll;
}
</style>
