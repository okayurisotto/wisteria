<script lang='ts' setup>
import { useTemplateRef } from 'vue';
import type * as Misskey from 'misskey-js';
import { defaultStore } from '@/store.js';

const props = defineProps<{
	note: Misskey.entities.Note;
	canRenote: boolean;
}>();

const emit = defineEmits<{
	reply: [];
	renote: [];
	react: [];
	undoReact: [];
	clip: [];
	showMenu: [];
}>();

const reply = useTemplateRef('reply');
const renote = useTemplateRef('renote');
const react = useTemplateRef('react');
const clip = useTemplateRef('clip');
const menu = useTemplateRef('menu');

defineExpose({
	reply,
	renote,
	react,
	clip,
	menu,
});
</script>

<template>
	<menu :class="$style.root">
		<li>
			<button ref="reply" :class="$style.button" class="_button" @click="emit('reply')">
				<i class="ti ti-arrow-back-up"></i>
				<p v-if="props.note.repliesCount > 0" :class="$style.buttonCount">{{ props.note.repliesCount }}</p>
			</button>
		</li>
		<li v-if="props.canRenote">
			<button ref="renote" :class="$style.button" class="_button" @mousedown="emit('renote')">
				<i class="ti ti-repeat"></i>
				<p v-if="props.note.renoteCount > 0" :class="$style.buttonCount">{{ props.note.renoteCount }}</p>
			</button>
		</li>
		<li v-if="!props.canRenote">
			<button :class="$style.button" class="_button" disabled>
				<i class="ti ti-ban"></i>
			</button>
		</li>
		<li v-if="props.note.myReaction == null">
			<button ref="react" :class="$style.button" class="_button" @mousedown="emit('react')">
				<i v-if="props.note.reactionAcceptance === 'likeOnly'" class="ti ti-heart"></i>
				<i v-else class="ti ti-plus"></i>
			</button>
		</li>
		<li v-if="props.note.myReaction != null">
			<button ref="react" :class="$style.button" class="_button" @click="emit('undoReact')">
				<i class="ti ti-minus"></i>
			</button>
		</li>
		<li v-if="defaultStore.state.showClipButtonInNoteFooter">
			<button ref="clip" :class="$style.button" class="_button" @mousedown="emit('clip')">
				<i class="ti ti-paperclip"></i>
			</button>
		</li>
		<li>
			<button ref="menu" :class="$style.button" class="_button" @mousedown="emit('showMenu')">
				<i class="ti ti-dots"></i>
			</button>
		</li>
	</menu>
</template>

<style module>
.root {
	contain: content;
	display: flex;
	list-style: none;
	margin: unset;
	padding: unset;
	gap: var(--margin);
}

.button {
	padding: 8px;
	display: flex;
	gap: 8px;
	line-height: 1em;
}

.button:not(:hover) {
	opacity: 0.7;
}

.buttonCount {
	margin: unset;
}
</style>
