<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="$style.root">
		<MkPostForm v-if="defaultStore.reactiveState.showFixedPostForm.value" :class="$style.postForm" class="post-form _panel" fixed style="margin-bottom: var(--margin);"/>
		<div v-if="queue > 0" :class="$style.new">
			<button class="_buttonPrimary" :class="$style.newButton" @click="scrollToTop">{{ i18n.ts.newNoteRecived }}</button>
		</div>
		<MkPullToRefresh :refresher="reloadTimeline">
			<div ref="timeline" :class="$style.timeline">
				<div ref="timelineTopMarker"></div>
				<MkNote :class="$style.timelineItem" v-for="note of notes" :key="note.id" :note="note" :withHardMute="true"/>
				<div ref="timelineBottomMarker"></div>
			</div>
		</MkPullToRefresh>
	</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import MkPostForm from '@/components/MkPostForm.vue';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import MkNote from '@/components/MkNote.vue';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { useStream } from '@/stream';
import * as MisskeyJS from 'misskey-js';
import { misskeyApi } from '@/scripts/misskey-api';

definePageMetadata(() => ({
	title: i18n.ts.timeline,
	icon: 'ti ti-home',
}));

const queue = ref(0);
const notes = ref<MisskeyJS.entities.Note[]>([]);
const oldestNoteId = computed(() => notes.value[notes.value.length - 1]?.id);
const isTop = ref(true);
const timeline = useTemplateRef('timeline');
const timelineTopMarker = useTemplateRef('timelineTopMarker');
const timelineBottomMarker = useTemplateRef('timelineBottomMarker');

const isScrollContainer = (e: Element): boolean => {
	const style = getComputedStyle(e);

	const canScrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && e.scrollWidth > e.clientWidth;
	const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && e.scrollHeight > e.clientHeight;

	return canScrollX || canScrollY;
};

const getScrollContainer = (e: Element): Element | null => {
	if (isScrollContainer(e)) return e;
	if (e.parentElement === null) return null;
	return getScrollContainer(e.parentElement);
};

const scrollContainer = computed(() => timeline.value !== null ? getScrollContainer(timeline.value) : null);

const scrollToTop = (): void => {
	scrollContainer.value?.scrollTo({
		top: 0,
		behavior: defaultStore.state.animation ? 'smooth' : 'instant',
	});
};

const reloadTimeline = async () => {
	notes.value = await misskeyApi('notes/timeline', { limit: 10 });
};

let stream: MisskeyJS.Stream;
let iObserver: IntersectionObserver;

onMounted(async () => {
	notes.value = await misskeyApi('notes/timeline', { limit: 10 });

	stream = useStream();

	const connection = stream.useChannel('homeTimeline');

	connection.on('note', (note) => {
		notes.value.unshift(note);

		if (isTop.value) {
			if (defaultStore.state.animation) {
				nextTick(() => {
					if (timeline.value === null) return;

					const topNote = timelineTopMarker.value?.nextElementSibling;
					if (topNote == null) return;

					const topNoteHeight = Math.round(topNote.getBoundingClientRect().height);

					timeline.value.animate(
						[
							{ translate: `0 ${-topNoteHeight}px` },
							{ translate: '0 0' },
						],
						{ easing: 'cubic-bezier(0.23, 1, 0.32, 1)', duration: 700 },
					);
				});
			}
		} else {
			queue.value++;
		}
	});

	iObserver = new IntersectionObserver(async (entries) => {
		for (const entry of entries) {
			if (entry.target === timelineTopMarker.value) {
				isTop.value = entry.isIntersecting;
				queue.value = 0;
			}

			if (entry.target === timelineBottomMarker.value) {
				if (entry.isIntersecting) {
					notes.value.push(...await misskeyApi('notes/timeline', {
						limit: 10,
						...(oldestNoteId.value !== undefined ? { untilId: oldestNoteId.value } : {}),
					}));
				}
			}
		}
	});

	if (timelineTopMarker.value) iObserver.observe(timelineTopMarker.value);
	if (timelineBottomMarker.value) iObserver.observe(timelineBottomMarker.value);
});

onUnmounted(() => {
	stream.close();
	iObserver.disconnect();
});
</script>

<style lang="scss" module>
.root {
	box-sizing: border-box;
	margin-inline: auto;
	max-width: 800px;
	padding: var(--margin);
}

.new {
	position: sticky;
	top: calc(var(--stickyTop, 0px) + 16px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--margin));
	}
}

.newButton {
	display: block;
	margin: var(--margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: var(--rounded-full);
}

.postForm {
	border-radius: var(--rounded);
}

.timeline {
	background-color: var(--panel);
	border-radius: var(--rounded);
	display: flex;
	flex-direction: column;
	overflow: clip;
}

.timelineItem:not(:last-of-type) {
	border-bottom: 1px solid var(--divider);
}
</style>
