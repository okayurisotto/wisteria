<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<span>
	<span v-text="hh"></span>
	<span :class="[$style.colon, { [$style.showColon]: showColon }]">:</span>
	<span v-text="mm"></span>
	<span v-if="showS" :class="[$style.colon, { [$style.showColon]: showColon }]">:</span>
	<span v-if="showS" v-text="ss"></span>
	<span v-if="showMs" :class="[$style.colon, { [$style.showColon]: showColon }]">:</span>
	<span v-if="showMs" v-text="ms"></span>
</span>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
	showS?: boolean;
	showMs?: boolean;
	offset?: number;
	now?: () => Date;
}>(), {
	showS: true,
	showMs: false,
	offset: 0 - new Date().getTimezoneOffset(),
	now: () => new Date(),
});

const hh = ref('');
const mm = ref('');
const ss = ref('');
const ms = ref('');
const showColon = ref(false);
const interval = computed(() => props.showMs ? 10 : 1000);
let prevSec: number | null = null;

watch(showColon, (v) => {
	if (v) {
		window.setTimeout(() => {
			showColon.value = false;
		}, 30);
	}
});

const tick = (): void => {
	const now = props.now();
	now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + props.offset);
	hh.value = now.getHours().toString().padStart(2, '0');
	mm.value = now.getMinutes().toString().padStart(2, '0');
	ss.value = now.getSeconds().toString().padStart(2, '0');
	ms.value = Math.floor(now.getMilliseconds() / 10).toString().padStart(2, '0');
	if (now.getSeconds() !== prevSec) showColon.value = true;
	prevSec = now.getSeconds();
};

tick();

// #region timer

let timer: ReturnType<typeof setInterval> | null = null;

watch(interval, () => {
	if (timer !== null) clearInterval(timer);
	timer = setInterval(tick, interval.value);
});

onMounted(() => {
	timer = setInterval(tick, interval.value);
});

onUnmounted(() => {
	if (timer !== null) clearInterval(timer);
});

// #endregion
</script>

<style lang="scss" module>
.colon {
	opacity: 0;
	transition: opacity 1s ease;

	&.showColon {
		opacity: 1;
		transition: opacity 0s;
	}
}
</style>
