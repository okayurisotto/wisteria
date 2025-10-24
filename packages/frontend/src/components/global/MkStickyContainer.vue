<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="rootEl">
	<div ref="headerEl">
		<slot name="header"></slot>
	</div>
	<div ref="bodyEl" :data-sticky-container-header-height="headerHeight">
		<slot></slot>
	</div>
	<div ref="footerEl">
		<slot name="footer"></slot>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, provide, inject, type Ref, ref, watch, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { CURRENT_STICKY_BOTTOM, CURRENT_STICKY_TOP } from '@/const.js';

const rootEl = useTemplateRef('rootEl');
const headerEl = useTemplateRef('headerEl');
const footerEl = useTemplateRef('footerEl');
const bodyEl = useTemplateRef('bodyEl');

const headerHeight = ref<string | undefined>();
const childStickyTop = ref(0);
const parentStickyTop = inject<Ref<number>>(CURRENT_STICKY_TOP, ref(0));
provide(CURRENT_STICKY_TOP, childStickyTop);

const footerHeight = ref<string | undefined>();
const childStickyBottom = ref(0);
const parentStickyBottom = inject<Ref<number>>(CURRENT_STICKY_BOTTOM, ref(0));
provide(CURRENT_STICKY_BOTTOM, childStickyBottom);

const calc = () => {
	// コンポーネントが表示されてないけどKeepAliveで残ってる場合などは null になる
	if (headerEl.value != null) {
		childStickyTop.value = parentStickyTop.value + headerEl.value.offsetHeight;
		headerHeight.value = headerEl.value.offsetHeight.toString();
	}

	// コンポーネントが表示されてないけどKeepAliveで残ってる場合などは null になる
	if (footerEl.value != null) {
		childStickyBottom.value = parentStickyBottom.value + footerEl.value.offsetHeight;
		footerHeight.value = footerEl.value.offsetHeight.toString();
	}
};

useResizeObserver([headerEl, footerEl], () => {
	window.setTimeout(() => {
		calc();
	}, 100);
});

onMounted(() => {
	calc();

	watch([parentStickyTop, parentStickyBottom], calc);

	watch(childStickyTop, () => {
		if (bodyEl.value == null) return;
		bodyEl.value.style.setProperty('--stickyTop', `${childStickyTop.value}px`);
	}, {
		immediate: true,
	});

	watch(childStickyBottom, () => {
		if (bodyEl.value == null) return;
		bodyEl.value.style.setProperty('--stickyBottom', `${childStickyBottom.value}px`);
	}, {
		immediate: true,
	});

	if (headerEl.value != null) {
		headerEl.value.style.position = 'sticky';
		headerEl.value.style.top = 'var(--stickyTop, 0)';
		headerEl.value.style.zIndex = '1000';
	}

	if (footerEl.value != null) {
		footerEl.value.style.position = 'sticky';
		footerEl.value.style.bottom = 'var(--stickyBottom, 0)';
		footerEl.value.style.zIndex = '1000';
	}
});

defineExpose({
	rootEl: rootEl,
});
</script>
