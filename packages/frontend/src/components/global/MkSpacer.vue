<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div :class="$style.root">
    <div :class="$style.content">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
	contentMax?: number | undefined | null;
}>();
</script>

<style lang="scss" module>
.root {
	box-sizing: border-box;
	padding: var(--margin);
}

.content {
	margin-inline: auto;
	max-width: v-bind('$props.contentMax != null ? $props.contentMax + "px" : "auto"');
}
</style>
