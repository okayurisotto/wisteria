<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Transition
	:name="transitionName"
	:enterActiveClass="normalizeClass({
		[$style.transition_modalDrawer_enterActive]: transitionName === 'modal-drawer',
		[$style.transition_modalPopup_enterActive]: transitionName === 'modal-popup',
		[$style.transition_modal_enterActive]: transitionName === 'modal',
		[$style.transition_send_enterActive]: transitionName === 'send',
	})"
	:leaveActiveClass="normalizeClass({
		[$style.transition_modalDrawer_leaveActive]: transitionName === 'modal-drawer',
		[$style.transition_modalPopup_leaveActive]: transitionName === 'modal-popup',
		[$style.transition_modal_leaveActive]: transitionName === 'modal',
		[$style.transition_send_leaveActive]: transitionName === 'send',
	})"
	:enterFromClass="normalizeClass({
		[$style.transition_modalDrawer_enterFrom]: transitionName === 'modal-drawer',
		[$style.transition_modalPopup_enterFrom]: transitionName === 'modal-popup',
		[$style.transition_modal_enterFrom]: transitionName === 'modal',
		[$style.transition_send_enterFrom]: transitionName === 'send',
	})"
	:leaveToClass="normalizeClass({
		[$style.transition_modalDrawer_leaveTo]: transitionName === 'modal-drawer',
		[$style.transition_modalPopup_leaveTo]: transitionName === 'modal-popup',
		[$style.transition_modal_leaveTo]: transitionName === 'modal',
		[$style.transition_send_leaveTo]: transitionName === 'send',
	})"
	:duration="transitionDuration" appear @afterLeave="emit('closed')" @enter="emit('opening')" @afterEnter="onOpened"
>
	<div v-show="manualShowing != null ? manualShowing : showing" v-hotkey.global="keymap" :class="[$style.root, { [$style.drawer]: type === 'drawer', [$style.dialog]: type === 'dialog', [$style.popup]: type === 'popup' }]" :style="{ zIndex, pointerEvents: (manualShowing != null ? manualShowing : showing) ? 'auto' : 'none', '--transformOrigin': transformOrigin }">
		<div class="_modalBg" :class="[$style.bg, { [$style.bgTransparent]: isEnableBgTransparent }]" :style="{ zIndex }" @click="onBgClick" @mousedown="onBgClick" @contextmenu.prevent.stop="() => {}"></div>
		<div
			ref="content"
			class="_shadow"
			:class="[$style.content, { [$style.fixed]: fixed }]"
			:style="{
				zIndex,
				left: align?.left.value + 'px',
				top: align?.top.value + 'px',
				maxHeight: align?.top.maxLength != null ? align.top.maxLength + 'px' : maxHeight + 'px',
				maxWidth: align?.left.maxLength != null ? align.left.maxLength + 'px' : '',
			}"
			@click.self="onBgClick"
		>
			<slot :type="type"></slot>
		</div>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { nextTick, normalizeClass, onMounted, provide, watch, ref, shallowRef, computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import * as os from '@/os.js';
import { isTouchUsing } from '@/scripts/touch.js';
import { defaultStore } from '@/store.js';
import { deviceKind } from '@/scripts/device-kind.js';
import { getFloatingPosition } from '@/scripts/getFloatingPosition.js';

function getFixedContainer(el: Element | null): Element | null {
	if (el == null || el.tagName === 'BODY') return null;
	const position = window.getComputedStyle(el).getPropertyValue('position');
	if (position === 'fixed') {
		return el;
	} else {
		return getFixedContainer(el.parentElement);
	}
}

type ModalTypes = 'popup' | 'dialog' | 'drawer';

const props = withDefaults(defineProps<{
	manualShowing?: boolean | null;
	anchor?: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom'; };
	src?: HTMLElement | null;
	preferType?: ModalTypes | 'auto';
	zPriority?: 'low' | 'middle' | 'high';
	transparentBg?: boolean;
}>(), {
	manualShowing: null,
	src: null,
	anchor: () => ({ x: 'center', y: 'bottom' }),
	preferType: 'auto',
	zPriority: 'low',
	transparentBg: false,
});

const emit = defineEmits<{
	opening: [];
	opened: [];
	click: [];
	esc: [];
	close: [];
	closed: [];
}>();

provide('modal', true);

const maxHeight = ref<number>();
const fixed = ref(false);
const transformOrigin = ref('center');
const showing = ref(true);
const content = shallowRef<HTMLElement>();
const zIndex = os.claimZIndex(props.zPriority);
const useSendAnime = ref(false);
const type = computed<ModalTypes>(() => {
	if (props.preferType === 'auto') {
		if (!defaultStore.state.disableDrawer && isTouchUsing && deviceKind === 'smartphone') {
			return 'drawer';
		} else {
			return props.src != null ? 'popup' : 'dialog';
		}
	} else {
		return props.preferType!;
	}
});
const isEnableBgTransparent = computed(() => props.transparentBg && (type.value === 'popup'));
const transitionName = computed((() =>
	defaultStore.state.animation
		? useSendAnime.value
			? 'send'
			: type.value === 'drawer'
				? 'modal-drawer'
				: type.value === 'popup'
					? 'modal-popup'
					: 'modal'
		: ''
));
const transitionDuration = computed((() =>
	transitionName.value === 'send'
		? 400
		: transitionName.value === 'modal-popup'
			? 100
			: transitionName.value === 'modal'
				? 200
				: transitionName.value === 'modal-drawer'
					? 200
					: 0
));
const windowSize = useWindowSize();

let contentClicking = false;

function close(opts: { useSendAnimation?: boolean } = {}) {
	if (opts.useSendAnimation) {
		useSendAnime.value = true;
	}

	// eslint-disable-next-line vue/no-mutating-props
	if (props.src) props.src.style.pointerEvents = 'auto';
	showing.value = false;
	emit('close');
}

function onBgClick() {
	if (contentClicking) return;
	emit('click');
}

if (type.value === 'drawer') {
	maxHeight.value = windowSize.height.value * 0.75;
}

const keymap = {
	'esc': () => emit('esc'),
};

const MARGIN = 16;

const align = computed(() => {
	if (props.src == null) return;
	if (type.value === 'drawer') return;
	if (type.value === 'dialog') return;
	if (content.value == null) return;

	const srcRect = props.src.getBoundingClientRect();

	const left = getFloatingPosition({
		contentAlignment: props.anchor.x === 'left' ? 'negative' : props.anchor.x === 'right' ? 'positive' : 'center',
		contentSize: content.value.offsetWidth,
		target: srcRect.left,
		targetSize: srcRect.width,
		viewportMargin: MARGIN,
		viewportSize: windowSize.width.value,
	});

	const top = getFloatingPosition({
		contentAlignment: props.anchor.y === 'top' ? 'negative' : props.anchor.y === 'bottom' ? 'positive' : 'center',
		contentSize: content.value.offsetHeight,
		target: srcRect.top,
		targetSize: srcRect.height,
		viewportMargin: MARGIN,
		viewportSize: windowSize.height.value,
	});

	return { left, top };
});

const onOpened = () => {
	emit('opened');

	// モーダルコンテンツにマウスボタンが押され、コンテンツ外でマウスボタンが離されたときにモーダルバックグラウンドクリックと判定させないためにマウスイベントを監視しフラグ管理する
	const el = content.value?.children[0];
	el?.addEventListener('mousedown', () => {
		contentClicking = true;
		window.addEventListener('mouseup', () => {
			// click イベントより先に mouseup イベントが発生するかもしれないのでちょっと待つ
			window.setTimeout(() => {
				contentClicking = false;
			}, 100);
		}, { passive: true, once: true });
	}, { passive: true });
};

onMounted(() => {
	watch(() => props.src, async () => {
		if (props.src) {
			// eslint-disable-next-line vue/no-mutating-props
			props.src.style.pointerEvents = 'none';
		}
		fixed.value = (type.value === 'drawer') || (getFixedContainer(props.src) != null);

		await nextTick();
	}, { immediate: true });
});

defineExpose({
	close,
});
</script>

<style lang="scss" module>
.transition_send_enterActive,
.transition_send_leaveActive {
	> .bg {
		transition: opacity 0.3s !important;
	}

	> .content {
    transform: translateY(0px);
		transition: opacity 0.3s ease-in, transform 0.3s cubic-bezier(.5,-0.5,1,.5) !important;
	}
}
.transition_send_enterFrom,
.transition_send_leaveTo {
	> .bg {
		opacity: 0;
	}

	> .content {
		pointer-events: none;
		opacity: 0;
		transform: translateY(-300px);
	}
}

.transition_modal_enterActive,
.transition_modal_leaveActive {
	> .bg {
		transition: opacity 0.2s !important;
	}

	> .content {
		transform-origin: var(--transformOrigin);
		transition: opacity 0.2s, transform 0.2s !important;
	}
}
.transition_modal_enterFrom,
.transition_modal_leaveTo {
	> .bg {
		opacity: 0;
	}

	> .content {
		pointer-events: none;
		opacity: 0;
		transform-origin: var(--transformOrigin);
		transform: scale(0.9);
	}
}

.transition_modalPopup_enterActive,
.transition_modalPopup_leaveActive {
	> .bg {
		transition: opacity 0.1s !important;
	}

	> .content {
		transform-origin: var(--transformOrigin);
		transition: opacity 0.1s cubic-bezier(0, 0, 0.2, 1), transform 0.1s cubic-bezier(0, 0, 0.2, 1) !important;
	}
}
.transition_modalPopup_enterFrom,
.transition_modalPopup_leaveTo {
	> .bg {
		opacity: 0;
	}

	> .content {
		pointer-events: none;
		opacity: 0;
		transform-origin: var(--transformOrigin);
		transform: scale(0.9);
	}
}

.transition_modalDrawer_enterActive {
	> .bg {
		transition: opacity 0.2s !important;
	}

	> .content {
		transition: transform 0.2s cubic-bezier(0,.5,0,1) !important;
	}
}
.transition_modalDrawer_leaveActive {
	> .bg {
		transition: opacity 0.2s !important;
	}

	> .content {
		transition: transform 0.2s cubic-bezier(0,.5,0,1) !important;
	}
}
.transition_modalDrawer_enterFrom,
.transition_modalDrawer_leaveTo {
	> .bg {
		opacity: 0;
	}

	> .content {
		pointer-events: none;
		transform: translateY(100%);
	}
}

.root {
	&.dialog {
		> .content {
			position: fixed;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			margin: auto;
			padding: 32px;
			display: flex;
			overflow: auto;

			@media (max-width: 500px) {
				padding: 16px;
			}
		}
	}

	&.popup {
		> .content {
			position: absolute;

			&.fixed {
				position: fixed;
			}
		}
	}

	&.drawer {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: clip;

		> .content {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			margin: auto;
		}
	}
}

.content {
	overflow-y: scroll;
}

.bg {
	&.bgTransparent {
		background: transparent;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}
}
</style>
