<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<XWidgets :edit="editMode" :widgets="widgets" @addWidget="addWidget" @removeWidget="removeWidget" @updateWidget="updateWidget" @updateWidgets="updateWidgets" @exit="editMode = false"/>

	<button v-if="editMode" class="_textButton" style="font-size: 0.9em;" @click="editMode = false"><i class="ti ti-check"></i> {{ i18n.ts.editWidgetsExit }}</button>
	<button v-else class="_textButton" :class="$style.edit" style="font-size: 0.9em;" @click="editMode = true"><i class="ti ti-pencil"></i> {{ i18n.ts.editWidgets }}</button>
</div>
</template>

<script lang="ts">
import { computed, ref } from 'vue';
const editMode = ref(false);
</script>
<script lang="ts" setup>
import { widgets as widgetNames } from '@/widgets/index.ts';
import XWidgets from '@/components/MkWidgets.vue';
import { i18n } from '@/i18n.js';
import { defaultStore } from '@/store.js';

const props = withDefaults(defineProps<{
	// null = 全てのウィジェットを表示
	// left = place: leftだけを表示
	// right = rightとnullを表示
	place?: 'left' | null | 'right';
}>(), {
	place: null,
});

const widgets = computed(() => {
	const allWidgets = defaultStore.reactiveState.widgets.value.filter((widget) => widgetNames.includes(widget.name));

	if (props.place === 'left') {
		return allWidgets.filter(w => w.place === 'left');
	}

	if (props.place === 'right') {
		return allWidgets.filter(w => w.place === 'right');
	}

	return allWidgets;
});

function addWidget(widget) {
	defaultStore.set('widgets', [{
		...widget,
		place: props.place,
	}, ...defaultStore.state.widgets]);
}

function removeWidget(widget) {
	defaultStore.set('widgets', defaultStore.state.widgets.filter(w => w.id !== widget.id));
}

function updateWidget({ id, data }) {
	defaultStore.set('widgets', defaultStore.state.widgets.map(w => w.id === id ? {
		...w,
		data,
		place: props.place,
	} : w));
}

function updateWidgets(thisWidgets) {
	if (props.place === null) {
		defaultStore.set('widgets', thisWidgets);
		return;
	}
	if (props.place === 'left') {
		defaultStore.set('widgets', [
			...thisWidgets.map(w => ({ ...w, place: 'left' })),
			...defaultStore.state.widgets.filter(w => w.place !== 'left' && !thisWidgets.some(t => w.id === t.id)),
		]);
		return;
	}
	defaultStore.set('widgets', [
		...defaultStore.state.widgets.filter(w => w.place === 'left' && !thisWidgets.some(t => w.id === t.id)),
		...thisWidgets.map(w => ({ ...w, place: 'right' })),
	]);
}
</script>

<style lang="scss" module>
.edit {
	width: 100%;
}
</style>
