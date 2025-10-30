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
	<div
		v-show="props.showing"
		ref="content"
		:class="$style.root"
		class="_acrylic _shadow"
		:style="{ zIndex, maxWidth: `${props.maxWidth}px`, left: `${left}px`, top: `${top}px` }"
	>
		<slot>
			<template v-if="props.text">
				<Mfm v-if="props.asMfm" :text="props.text"/>
				<span v-else>{{ props.text }}</span>
			</template>
		</slot>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import * as os from '@/os.js';
import { useElementBounding, useWindowSize } from '@vueuse/core';
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

const horizontalAlignment = computed(() => {
	if (props.direction === 'left') return 'negative';
	if (props.direction === 'right') return 'positive';
	return 'center';
});

const verticalAlignment = computed(() => {
	if (props.direction === 'top') return 'negative';
	if (props.direction === 'bottom') return 'positive';
	return 'center';
});

const zIndex = os.claimZIndex('high');

const content = useTemplateRef('content');
const contentRect = useElementBounding(content);
const targetRect = useElementBounding(props.targetElement);
const windowSize = useWindowSize();

const left = computed(() => {
	const left = getFloatingPosition({
		target: targetRect.left.value,
		targetSize: targetRect.width.value,
		contentSize: contentRect.width.value,
		contentAlignment: horizontalAlignment.value,
		viewportSize: windowSize.width.value,
		viewportMargin: props.innerMargin,
	});

	return left.value;
});

const top = computed(() => {
	const top = getFloatingPosition({
		target: targetRect.top.value,
		targetSize: targetRect.height.value,
		contentSize: contentRect.height.value,
		contentAlignment: verticalAlignment.value,
		viewportSize: windowSize.height.value,
		viewportMargin: props.innerMargin,
	});

	return top.value;
});
</script>

<style lang="scss" module>
.transition_tooltip_enterActive,
.transition_tooltip_leaveActive {
	opacity: 1;
	transition: opacity 80ms linear;
}
.transition_tooltip_enterFrom,
.transition_tooltip_leaveTo {
	opacity: 0;
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
