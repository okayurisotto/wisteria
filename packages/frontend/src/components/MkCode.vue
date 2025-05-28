<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.codeBlockRoot">
	<button :class="$style.codeBlockCopyButton" class="_button" @click="copy">
		<i class="ti ti-copy"></i>
	</button>
	<Suspense>
		<template #fallback>
			<MkLoading />
		</template>
		<XCode v-if="show && lang" :code="code" :lang="lang"/>
		<XCode v-else :code="code"/>
	</Suspense>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as os from '@/os.js';
import MkLoading from '@/components/global/MkLoading.vue';
import XCode from '@/components/MkCode.core.vue';
import { defaultStore } from '@/store.js';
import copyToClipboard from '@/scripts/copy-to-clipboard.js';

const props = defineProps<{
	code: string;
	lang?: string;
}>();

const show = ref(!defaultStore.state.dataSaver.code);

function copy() {
	copyToClipboard(props.code);
	os.success();
}
</script>

<style module lang="scss">
.codeBlockRoot {
	position: relative;
}

.codeBlockCopyButton {
	position: absolute;
	top: 8px;
	right: 8px;
	opacity: 0.5;

	&:hover {
		opacity: 0.8;
	}
}

.codeBlockFallbackRoot {
	display: block;
	overflow-wrap: anywhere;
	background: var(--bg);
	padding: 1em;
	margin: .5em 0;
	overflow: auto;
	border-radius: var(--rounded);
}

.codeBlockFallbackCode {
	font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
}

.codePlaceholderRoot {
	display: block;
	width: 100%;
	background: none;
	border: none;
	outline: none;
  font: inherit;
  color: inherit;
	cursor: pointer;

	box-sizing: border-box;
	border-radius: var(--rounded);
	padding: 24px;
	margin-top: 4px;
	color: var(--fg);
	background: var(--bg);
}

.codePlaceholderContainer {
	text-align: center;
	font-size: 0.8em;
}
</style>
