<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Transition
	:enterActiveClass="defaultStore.state.animation ? $style.transition_tooltip_enterActive : ''"
	:leaveActiveClass="defaultStore.state.animation ? $style.transition_tooltip_leaveActive : ''"
	:enterFromClass="defaultStore.state.animation ? $style.transition_tooltip_enterFrom : ''"
	:leaveToClass="defaultStore.state.animation ? $style.transition_tooltip_leaveTo : ''"
	appear @afterLeave="emit('closed')"
>
	<div v-show="showing" ref="el" :class="$style.root" class="_acrylic _shadow" :style="{ zIndex, maxWidth: maxWidth + 'px' }">
		<slot>
			<template v-if="text">
				<Mfm v-if="asMfm" :text="text"/>
				<span v-else>{{ text }}</span>
			</template>
		</slot>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, useTemplateRef } from 'vue';
import * as os from '@/os.js';
import { useWindowSize } from '@vueuse/core';
import { getFloatingPosition } from '@/scripts/getFloatingPosition';
import { defaultStore } from '@/store.js';

const props = withDefaults(defineProps<{
	showing: boolean;
	targetElement?: HTMLElement;
	x?: number;
	y?: number;
	text?: string;
	asMfm?: boolean;
	maxWidth?: number;
	direction?: 'top' | 'bottom' | 'right' | 'left';
	innerMargin?: number;
}>(), {
	maxWidth: 250,
	direction: 'top',
	innerMargin: 0,
});

const emit = defineEmits<{
	closed: [];
}>();

// タイミングによっては最初から showing = false な場合があり、その場合に closed 扱いにしないと永久にDOMに残ることになる
if (!props.showing) emit('closed');

const el = useTemplateRef('el');
const zIndex = os.claimZIndex('high');

const windowSize = useWindowSize();
const VIEWPORT_MARGIN = 18;

function setPosition() {
	if (el.value == null) return;
	if (props.targetElement === undefined) return;

	const contentSize = el.value.getBoundingClientRect();
	const targetRect = props.targetElement.getBoundingClientRect();

	const left = getFloatingPosition({
		target: targetRect.left,
		targetSize: targetRect.width,
		contentSize: contentSize.width,
		contentAlignment: 'center',
		viewportSize: windowSize.width.value,
		viewportMargin: VIEWPORT_MARGIN,
	});

	const top = getFloatingPosition({
		target: targetRect.top,
		targetSize: targetRect.height,
		contentAlignment: 'negative',
		contentSize: contentSize.height,
		viewportSize: windowSize.height.value,
		viewportMargin: VIEWPORT_MARGIN,
	});

	el.value.style.left = `${left.value}px`;
	el.value.style.top = `${top.value}px`;
}

onMounted(() => {
	nextTick(() => {
		setPosition();
	});
});
</script>

<style lang="scss" module>
.transition_tooltip_enterActive,
.transition_tooltip_leaveActive {
	opacity: 1;
	transform: scale(1);
	transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_tooltip_enterFrom,
.transition_tooltip_leaveTo {
	opacity: 0;
	transform: scale(0.75);
}

.root {
	position: absolute;
	font-size: 0.8em;
	padding: 8px 12px;
	box-sizing: border-box;
	text-align: center;
	border-radius: var(--rounded);
	border: solid 0.5px var(--divider);
	pointer-events: none;
	transform-origin: center center;
	background-color: var(--panel);
}
</style>
