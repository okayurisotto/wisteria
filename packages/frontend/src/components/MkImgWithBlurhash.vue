<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="root" :class="['chromatic-ignore', $style.root, { [$style.cover]: cover }]" :title="title ?? ''">
	<TransitionGroup
		:duration="defaultStore.state.animation && props.transition?.duration || undefined"
		:enterActiveClass="defaultStore.state.animation && props.transition?.enterActiveClass || undefined"
		:leaveActiveClass="defaultStore.state.animation && (props.transition?.leaveActiveClass ?? $style.transition_leaveActive) || undefined"
		:enterFromClass="defaultStore.state.animation && props.transition?.enterFromClass || undefined"
		:leaveToClass="defaultStore.state.animation && props.transition?.leaveToClass || undefined"
		:enterToClass="defaultStore.state.animation && props.transition?.enterToClass || undefined"
		:leaveFromClass="defaultStore.state.animation && props.transition?.leaveFromClass || undefined"
	>
		<img v-show="hide" key="blurimg" ref="blurimg" :class="$style.img" :width="imgWidth" :height="imgHeight" :title="title ?? undefined"/>
		<img v-show="!hide" key="img" ref="img" :height="imgHeight" :width="imgWidth" :class="$style.img" :src="src ?? undefined" :title="title ?? undefined" :alt="alt ?? undefined" loading="eager" decoding="async"/>
	</TransitionGroup>
</div>
</template>

<script lang="ts">
import DrawBlurhash from '@/workers/draw-blurhash?worker';
import TestWebGL2 from '@/workers/test-webgl2?worker';
import { WorkerMultiDispatch } from '@/scripts/worker-multi-dispatch.js';
import { extractAvgColorFromBlurhash } from '@/scripts/extract-avg-color-from-blurhash.js';

const canvasPromise = new Promise<WorkerMultiDispatch | OffscreenCanvas | HTMLCanvasElement>(resolve => {
	// テスト環境で Web Worker インスタンスは作成できない
	if (import.meta.env.MODE === 'test') {
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		resolve(canvas);
		return;
	}
	const testWorker = new TestWebGL2();
	testWorker.addEventListener('message', event => {
		if (event.data.result) {
			const workers = new WorkerMultiDispatch(
				() => new DrawBlurhash(),
				Math.min(navigator.hardwareConcurrency - 1, 4),
			);
			resolve(workers);
			if (_DEV_) console.log('WebGL2 in worker is supported!');
		} else {
			resolve(new OffscreenCanvas(64, 64));
			if (_DEV_) console.log('WebGL2 in worker is not supported...');
		}
		testWorker.terminate();
	});
});
</script>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch, ref } from 'vue';
import { v4 as uuid } from 'uuid';
import { render } from 'buraha';
import { defaultStore } from '@/store.js';

const props = withDefaults(defineProps<{
	transition?: {
		duration?: number | { enter: number; leave: number; };
		enterActiveClass?: string;
		leaveActiveClass?: string;
		enterFromClass?: string;
		leaveToClass?: string;
		enterToClass?: string;
		leaveFromClass?: string;
	} | null;
	src?: string | null;
	hash?: string | null;
	alt?: string | null;
	title?: string | null;
	height?: number;
	width?: number;
	cover?: boolean;
	forceBlurhash?: boolean;
	onlyAvgColor?: boolean; // 軽量化のためにBlurhashを使わずに平均色だけを描画
}>(), {
	transition: null,
	src: null,
	alt: '',
	title: null,
	height: 64,
	width: 64,
	cover: true,
	forceBlurhash: false,
	onlyAvgColor: false,
});

const viewId = uuid();
const blurimg = shallowRef<HTMLImageElement>();
const root = shallowRef<HTMLDivElement>();
const img = shallowRef<HTMLImageElement>();
const loaded = ref(false);
const canvasWidth = ref(64);
const canvasHeight = ref(64);
const imgWidth = ref(props.width);
const imgHeight = ref(props.height);
const blobTmp = ref<Blob>();
const blobUrl = ref<string>();
const hide = computed(() => !loaded.value || props.forceBlurhash);

function waitForDecode() {
	if (props.src != null && props.src !== '') {
		nextTick()
			.then(() => img.value?.decode())
			.then(() => {
				loaded.value = true;
			}, error => {
				console.log('Error occurred during decoding image', img.value, error);
			});
	} else {
		loaded.value = false;
	}
}

watch([() => props.width, () => props.height, root], () => {
	const ratio = props.width / props.height;
	if (ratio > 1) {
		canvasWidth.value = Math.round(64 * ratio);
		canvasHeight.value = 64;
	} else {
		canvasWidth.value = 64;
		canvasHeight.value = Math.round(64 / ratio);
	}

	const clientWidth = root.value?.clientWidth ?? 300;
	imgWidth.value = clientWidth;
	imgHeight.value = Math.round(clientWidth / ratio);
}, {
	immediate: true,
});

async function drawImage(blob: Blob): Promise<void> {
	// blurimgがない（mountedされていない）場合はblobTmpに保存しておく
	if (blurimg.value === undefined) {
		blobTmp.value = blob;
		return;
	}

	// blurimgがあれば描画する
	const url = URL.createObjectURL(blob);
	blurimg.value.src = url;

	if (blobUrl.value !== undefined) {
		URL.revokeObjectURL(blobUrl.value);
	}
	blobUrl.value = url;
}

function drawAvg() {
	if (blurimg.value === undefined || props.hash == null) return;

	const avgColor = extractAvgColorFromBlurhash(props.hash) ?? '#888';
	blurimg.value.style.backgroundColor = avgColor;
}

async function draw() {
	if (props.hash == null) return;

	drawAvg();

	if (props.onlyAvgColor) return;

	const work = await canvasPromise;
	if (work instanceof WorkerMultiDispatch) {
		work.postMessage(
			{
				id: viewId,
				hash: props.hash,
			},
			undefined,
		);
	} else {
		try {
			render(props.hash, work);
			drawImage(await work.convertToBlob());
		} catch (error) {
			console.error('Error occurred during drawing blurhash', error);
		}
	}
}

function workerOnMessage(event: MessageEvent) {
	if (event.data.id !== viewId) return;
	drawImage(event.data.blob as Blob);
}

canvasPromise.then(work => {
	if (work instanceof WorkerMultiDispatch) {
		work.addListener(workerOnMessage);
	}

	draw();
});

watch(() => props.src, () => {
	waitForDecode();
});

watch(() => props.hash, () => {
	draw();
});

onMounted(() => {
	// drawImageがmountedより先に呼ばれている場合はここで描画する
	if (blobTmp.value) {
		drawImage(blobTmp.value);
	}
	waitForDecode();
});

onUnmounted(() => {
	if (blobUrl.value) {
		URL.revokeObjectURL(blobUrl.value)
	}

	canvasPromise.then(work => {
		if (work instanceof WorkerMultiDispatch) {
			work.removeListener(workerOnMessage);
		}
	});
});
</script>

<style lang="scss" module>
.transition_leaveActive {
	position: absolute;
	top: 0;
	left: 0;
}
.root {
	position: relative;
	width: 100%;
	height: 100%;

	&.cover {
		> .img {
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
</style>
