<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <component
    :is="self ? 'MkA' : 'a'"
    :class="$style.root"
    :[attr]="self ? url.substring(local.length) : url"
    rel="nofollow noopener"
    :target="target"
  >
    <article :class="$style.body">
      <header>
        <h1 v-if="fetching" :class="$style.title">
          <MkEllipsis />
        </h1>
        <h1 v-else-if="unknownUrl || title === null" :class="$style.title">
          {{ url }}
        </h1>
        <h1 v-else :class="$style.title" :title="title">
          {{ title }}
        </h1>
      </header>
      <div>
        <p v-if="unknownUrl" :class="$style.text">
          {{ i18n.ts.failedToPreviewUrl }}
        </p>
        <p v-else-if="fetching" :class="$style.text">
          <MkEllipsis />
        </p>
        <p v-else-if="description" :class="$style.text" :title="description">
          {{ description }}
        </p>
      </div>
      <footer :class="$style.footer">
        <img v-if="icon" :class="$style.siteIcon" :src="icon">
        <p v-if="unknownUrl" :class="$style.siteName">
          {{ requestUrl.host }}
        </p>
        <p v-else-if="fetching" :class="$style.siteName">
          <MkEllipsis />
        </p>
        <p v-else :class="$style.siteName" :title="sitename ?? requestUrl.host">
          {{ sitename ?? requestUrl.host }}
        </p>
      </footer>
    </article>
    <img v-if="thumbnail && !sensitive && !defaultStore.state.dataSaver['urlPreview']" :class="$style.thumbnail" :src="thumbnail">
  </component>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type { summaly } from '@misskey-dev/summaly';
import { url as local } from '@/config.js';
import { i18n } from '@/i18n.js';
import { versatileLang } from '@/scripts/intl-const.js';
import { defaultStore } from '@/store.js';

type SummalyResult = Awaited<ReturnType<typeof summaly>>;

const props = withDefaults(defineProps<{
	url: string;
	detail?: boolean;
	compact?: boolean;
	showActions?: boolean;
}>(), {
	detail: false,
	compact: false,
	showActions: true,
});

const requestUrl = computed(() => {
	const url = new URL(props.url);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid url');
	url.hash = '';
	return url;
});
const self = computed(() => props.url.startsWith(local));
const attr = computed(() => self.value ? 'to' : 'href');
const target = computed(() => self.value ? null : '_blank');
const fetching = ref(true);
const title = ref<string | null>(null);
const description = ref<string | null>(null);
const thumbnail = ref<string | null>(null);
const icon = ref<string | null>(null);
const sitename = ref<string | null>(null);
const sensitive = ref<boolean>(false);
const unknownUrl = ref(false);

onMounted(async () => {
	const url = new URL('/url', location.origin);
	url.searchParams.set('url', requestUrl.value.href);
	url.searchParams.set('lang', versatileLang);

	const res = await fetch(url);
	if (!res.ok) {
		fetching.value = false;
		unknownUrl.value = true;
		return;
	}

	const info: SummalyResult = await res.json();

	fetching.value = false;
	unknownUrl.value = false;

	title.value = info.title;
	description.value = info.description;
	thumbnail.value = info.thumbnail;
	icon.value = info.icon;
	sitename.value = info.sitename;
	sensitive.value = info.sensitive ?? false;
});
</script>

<style lang="scss" module>
.root {
	contain: strict;
	container-type: size;

	align-items: center;
	border-radius: var(--rounded);
	border: 1px solid var(--divider);
	box-sizing: border-box;
	display: flex;
	height: 100px;
	transition: border-color .1s;

	&:hover {
		border-color: var(--accent);
		text-decoration: none;
	}
}

.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow-x: hidden;
	padding: var(--margin-half);
	row-gap: 8px;
}

.title,
.text,
.siteName {
	margin: 0;
	overflow-x: hidden;
	text-overflow: ellipsis;
	text-wrap: nowrap;
}

.title {
	font-size: 1em;
}

.text {
	font-size: 0.8em;
}

.footer {
	align-items: end;
	display: flex;
	gap: 4px;
}

.siteIcon {
	height: 16px;
	width: 16px;
}

.siteName {
	font-size: 0.8em;
}

.thumbnail {
	height: 100cqh;
	max-width: min(191cqh, 30cqw);
	min-width: 100cqh;
	object-fit: cover;

	@container (width < 350px) {
		display: none;
	}
}
</style>
