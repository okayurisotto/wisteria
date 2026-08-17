<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="$style.root">
		<MkPostForm v-if="defaultStore.reactiveState.showFixedPostForm.value" :class="$style.postForm" class="post-form _panel" fixed style="margin-bottom: var(--margin);"/>
		<div v-if="queue.length > 0" :class="$style.new">
			<button class="_buttonPrimary" :class="$style.newButton" @click="scrollToTop">{{ i18n.ts.newNoteRecived }}</button>
		</div>
		<MkPullToRefresh :refresher="reloadTimeline">
			<div ref="timeline" :class="$style.timeline">
				<div ref="timelineTopMarker"></div>
				<MkNote :class="$style.timelineItem" v-for="note of filteredNotes" :key="note.id" :note="note" :withHardMute="true"/>
				<div ref="timelineBottomMarker" :class="$style.timelineBottomMarker"></div>
			</div>
		</MkPullToRefresh>
	</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import * as MisskeyJS from 'misskey-js';
import { useIntersectionObserver } from '@vueuse/core';
import MkPostForm from '@/components/MkPostForm.vue';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import MkNote from '@/components/MkNote.vue';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { useStream } from '@/stream';
import { $i } from '@/account';
import { misskeyApi } from '@/scripts/misskey-api';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { playMisskeySfx } from '@/scripts/sound';
import { checkWordMute } from '@/scripts/check-word-mute';

definePageMetadata(() => ({
	title: i18n.ts.timeline,
	icon: 'ti ti-home',
}));

const notes = ref<MisskeyJS.entities.Note[]>([]);
const queue = ref<MisskeyJS.entities.Note[]>([]);
const filteredNotes = computed(() => filterNotes(notes.value));
const oldestNoteId = computed(() => notes.value[notes.value.length - 1]?.id);
const isTop = ref(true);
const timeline = useTemplateRef('timeline');
const timelineTopMarker = useTemplateRef('timelineTopMarker');
const timelineBottomMarker = useTemplateRef('timelineBottomMarker');

const sleep = (ms: number) => {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
};

const filterNotes = (notes: MisskeyJS.entities.Note[]): MisskeyJS.entities.Note[] => {
	return notes.filter((note) => !checkMute(note, $i?.hardMutedWords));
};

/**
 * 指定された数以上のノートを取得しようとする。
 */
const fetchNotes = async (min: number, untilId?: string | null | undefined) => {
	const notes: MisskeyJS.entities.Note[] = [];
	let oldestNoteId = untilId ?? undefined;
	let filteredNoteCount = 0;

	let first = true;

	while (filteredNoteCount < min) {
		if (first) {
			first = false;
		} else {
			await sleep(100);
		}

		const fetchedNotes = await misskeyApi('notes/timeline', { limit: 10, untilId: oldestNoteId });

		if (fetchedNotes.length === 0) break;

		notes.push(...fetchedNotes);
		filteredNoteCount += filterNotes(fetchedNotes).length;
		oldestNoteId = fetchedNotes[fetchedNotes.length - 1]?.id;
	}

	return notes;
};

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
	notes.value = await fetchNotes(10);
};

let stream: MisskeyJS.Stream;

const smoothUnshift = () => {
	if (timeline.value === null) return;

	const topNote = timelineTopMarker.value?.nextElementSibling;
	if (topNote == null) return;

	const topNoteHeight = Math.round(topNote.getBoundingClientRect().height);

	timeline.value.animate(
		[
			{ translate: `0 ${-topNoteHeight}px` },
			{ translate: '0 0' },
		],
		{ easing: 'cubic-bezier(0.23, 1, 0.32, 1)', duration: 700 }
	);
};

const checkMute = (note: MisskeyJS.entities.Note, mutedWords: Array<string | string[]> | undefined | null): boolean => {
	if (mutedWords == null) return false;

	if (checkWordMute(note, $i, mutedWords)) return true;
	if (note.reply && checkWordMute(note.reply, $i, mutedWords)) return true;
	if (note.renote && checkWordMute(note.renote, $i, mutedWords)) return true;

	return false;
};

useIntersectionObserver([timelineTopMarker, timelineBottomMarker], async (entries) => {
	for (const entry of entries) {
		if (entry.target === timelineTopMarker.value) {
			isTop.value = entry.isIntersecting;

			if (queue.value.length !== 0) {
				notes.value = [...queue.value, ...notes.value];
				queue.value = [];
			}
		}

		if (entry.target === timelineBottomMarker.value) {
			if (entry.isIntersecting) {
				if (oldestNoteId.value !== undefined) {
					const prevNotes = await fetchNotes(10, oldestNoteId.value);
					notes.value = [...notes.value, ...prevNotes];
				}
			}
		}
	}
});

onMounted(async () => {
	notes.value = await fetchNotes(10);

	stream = useStream();

	stream.on("noteUpdated", (data) => {
		if (data.type === 'deleted') {
			const deletedNoteId = data.id;
			notes.value = notes.value.filter(({ id }) => id !== deletedNoteId);
			queue.value = queue.value.filter(({ id }) => id !== deletedNoteId);
		}
	});

	const connection = stream.useChannel('homeTimeline');

	connection.on('note', (note) => {
		const hardMuted = checkMute(note, $i?.hardMutedWords);
		if (!hardMuted) {
			if ($i?.id === note.userId) {
				playMisskeySfx('noteMy');
			} else {
				playMisskeySfx('note');
			}
		}

		if (isTop.value) {
			notes.value.unshift(note);
			stream.send('sr', { id: note.id });

			if (defaultStore.state.animation) {
				nextTick(smoothUnshift);
			}
		} else {
			queue.value.unshift(note);
			stream.send('s', { id: note.id });
		}
	});
});

onUnmounted(() => {
	stream.close();
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

.timelineItem:not(:nth-last-child(2)) {
	border-bottom: 1px solid var(--divider);
}

.timelineBottomMarker {
	translate: 0 -150px;
}
</style>
