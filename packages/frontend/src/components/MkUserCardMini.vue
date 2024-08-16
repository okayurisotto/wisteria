<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-adaptive-bg :class="[$style.root]">
	<MkAvatar :class="$style.avatar" :user="user" indicator/>
	<div :class="$style.body">
		<span :class="$style.name"><MkUserName :user="user"/></span>
		<span :class="$style.sub"><span class="_monospace">@{{ acct(user) }}</span></span>
	</div>
</div>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { acct } from '@/filters/user.js';

const props = withDefaults(defineProps<{
	user: Misskey.entities.User;
	withChart: boolean;
}>(), {
	withChart: true,
});
</script>

<style lang="scss" module>
$bodyTitleHieght: 18px;
$bodyInfoHieght: 16px;

.root {
	display: flex;
	align-items: center;
	padding: 16px;
	background: var(--panel);
	border-radius: 8px;
}

.avatar {
	display: block;
	width: ($bodyTitleHieght + $bodyInfoHieght);
	height: ($bodyTitleHieght + $bodyInfoHieght);
	margin-right: 12px;
}

.body {
	flex: 1;
	overflow: hidden;
	font-size: 0.9em;
	color: var(--fg);
	padding-right: 8px;
}

.name {
	display: block;
	width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: $bodyTitleHieght;
}

.sub {
	display: block;
	width: 100%;
	font-size: 95%;
	opacity: 0.7;
	line-height: $bodyInfoHieght;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
