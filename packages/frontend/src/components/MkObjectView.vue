<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<MkCode lang="json" :code="JSON.stringify(props.value, undefined, 2)" />
</template>

<script lang="ts" setup>
import MkCode from './MkCode.vue';

const props = defineProps<{
	value: Record<string, unknown>;
}>();
</script>
