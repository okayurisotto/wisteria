<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.codeBlockRoot, { [$style.codeEditor]: codeEditor }, (darkMode ? $style.dark : $style.light)]" v-html="html"></div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { codeToHtml, type BundledLanguage, type BundledTheme, type CodeToHastOptions } from 'shiki';
import { getTheme } from '@/scripts/code-highlighter.js';
import { computedAsync } from '@vueuse/core';
import { colorScheme } from '@/themes/colorScheme';

const props = defineProps<{
	code: string;
	lang?: string;
	codeEditor?: boolean;
}>();

const darkMode = computed(() => colorScheme.value === 'dark');
const codeLang = computed(() => props.lang ?? 'text');

const [lightThemeName, darkThemeName] = await Promise.all([
	getTheme('light'),
	getTheme('dark'),
]);

const html = computedAsync(async () => {
	const opts: CodeToHastOptions<BundledLanguage, BundledTheme> = {
		lang: codeLang.value,
		themes: {
			fallback: 'dark-plus',
			light: lightThemeName,
			dark: darkThemeName,
		},
		defaultColor: false,
		cssVariablePrefix: '--shiki-',
	};

	try {
		return await codeToHtml(props.code, opts);
	} catch {
		return await codeToHtml(props.code, { ...opts, lang: 'text' });
	}
});
</script>

<style module lang="scss">
.codeBlockRoot :global(.shiki) {
	padding: 1em;
	margin: .5em 0;
	overflow: auto;
	border-radius: var(--rounded);
	border: 1px solid var(--divider);
	font-family: monospace;

	color: var(--shiki-fallback);
	background-color: var(--shiki-fallback-bg);

	& span {
		color: var(--shiki-fallback);
		background-color: var(--shiki-fallback-bg);
	}

	& pre,
	& code {
		font-family: monospace;
	}
}

.light.codeBlockRoot :global(.shiki) {
	color: var(--shiki-light);
	background-color: var(--shiki-light-bg);

	& span {
		color: var(--shiki-light);
		background-color: var(--shiki-light-bg);
	}
}

.dark.codeBlockRoot :global(.shiki) {
	color: var(--shiki-dark);
	background-color: var(--shiki-dark-bg);

	& span {
		color: var(--shiki-dark);
		background-color: var(--shiki-dark-bg);
	}
}

.codeBlockRoot.codeEditor {
	min-width: 100%;
	height: 100%;

	& :global(.shiki) {
		padding: 12px;
		margin: 0;
		border-radius: var(--rounded);
		border: none;
		min-height: 130px;
		pointer-events: none;
		min-width: calc(100% - 24px);
		height: 100%;
		display: inline-block;
		line-height: 1.5em;
		font-size: 1em;
		overflow: visible;
		text-rendering: inherit;
    text-transform: inherit;
    white-space: pre;

		& span {
			display: inline-block;
			min-height: 1em;
		}
	}
}
</style>
