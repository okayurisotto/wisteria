<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<label :class="[$style.root, { [$style.disabled]: disabled }]">
		<input
			ref="input"
			type="checkbox"
			:class="$style.input"
			v-model="checked"
			:disabled="props.disabled"
			@click="toggle"
		>
		<div>
			<p :class="$style.body">
				<!-- TODO: 無名slotの方は廃止 -->
				<slot name="label"></slot><slot></slot>
				<span v-if="helpText" v-tooltip:dialog="helpText" class="_button _help" :class="$style.help"><i class="ti ti-help-circle"></i></span>
			</p>
			<p :class="$style.caption"><slot name="caption"></slot></p>
		</div>
	</label>
</template>

<script lang="ts" setup>
import { toRefs, type Ref } from 'vue';

const props = defineProps<{
	modelValue: boolean | Ref<boolean>;
	disabled?: boolean;
	helpText?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [v: boolean];
}>();

const checked = toRefs(props).modelValue;
const toggle = () => {
	if (props.disabled) return;
	emit('update:modelValue', !checked.value);
};
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: flex;
	transition: all 0.2s ease;
	user-select: none;
	align-items: center;
	cursor: pointer;
	gap: .5em;

	&.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.input {
	cursor: inherit;
}

.body {
	margin: unset;
	color: var(--fg);
	display: flex;
	gap: .5em;
}

.caption {
	margin: 8px 0 0 0;
	color: var(--fgTransparentWeak);
	font-size: 0.85em;

	&:empty {
		display: none;
	}
}

.help {
	font-size: 85%;
	vertical-align: top;
}
</style>
