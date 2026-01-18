<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<header :class="$style.root">
		<div :class="$style.user">
			<MkA v-user-preview="props.note.user.id" :class="$style.name" :to="userPage(props.note.user)">
				<MkUserName :user="props.note.user"/>
			</MkA>
			<span v-if="props.note.user.isBot" :class="$style.isBot">bot</span>
			<MkAcct :class="$style.acct" :user="props.note.user"/>
		</div>
		<div :class="$style.info">
			<MkA :to="notePage(props.note)">
				<MkTime :time="props.note.createdAt" colored/>
			</MkA>
			<span :class="$style.visibility" :title="i18n.ts._visibility[props.note.visibility]">
				<i v-if="props.note.visibility === 'home'" class="ti ti-home"></i>
				<i v-if="props.note.visibility === 'followers'" class="ti ti-lock"></i>
				<i v-if="props.note.visibility === 'specified'" class="ti ti-mail"></i>
			</span>
			<span v-if="props.note.localOnly" :title="i18n.ts._visibility['disableFederation']"><i class="ti ti-rocket-off"></i></span>
			<span v-if="props.note.channel" :title="props.note.channel.name"><i class="ti ti-device-tv"></i></span>
		</div>
	</header>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { i18n } from '@/i18n.js';
import { notePage } from '@/filters/note.js';
import { userPage } from '@/filters/user.js';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();
</script>

<style lang="scss" module>
.root {
	align-items: baseline;
	contain: content;
	display: flex;
	gap: 0.5em;
	justify-content: space-between;
	white-space: nowrap;
}

.user {
	display: flex;
	gap: 0.5em;
}

.name {
	display: block;
	font-size: 1em;
	font-weight: bold;
	overflow: hidden;
	padding: 0;
}

.isBot {
	align-self: center;
	border-radius: var(--rounded);
	border: solid 0.5px var(--divider);
	font-size: 80%;
	padding: 1px 6px;
}

.acct {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
}

.info {
	display: flex;
	font-size: 0.9em;
	gap: 0.5em;
}

.visibility:empty {
	display: none;
}

.user,
.name,
.acct {
	overflow-inline: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
