<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" class="rsqzvsbo">
	<div class="shape1"></div>
	<div class="shape2"></div>
	<img :src="misskeysvg" class="misskey"/>
	<div class="emojis">
		<MkEmoji :normal="true" :noStyle="true" emoji="👍"/>
		<MkEmoji :normal="true" :noStyle="true" emoji="❤"/>
		<MkEmoji :normal="true" :noStyle="true" emoji="😆"/>
		<MkEmoji :normal="true" :noStyle="true" emoji="🎉"/>
		<MkEmoji :normal="true" :noStyle="true" emoji="🍮"/>
	</div>
	<div class="contents">
		<MkVisitorDashboard/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import misskeysvg from '/client-assets/misskey.svg';
import { misskeyApi } from '@/scripts/misskey-api.js';
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';

const meta = ref<Misskey.Endpoints['meta']['response']>();
const instances = ref<Misskey.entities.FederationInstance[]>();

misskeyApi('meta', { detail: true }).then(_meta => {
	meta.value = _meta;
});

misskeyApi('federation/instances', {
	sort: '+pubSub',
	limit: 20,
}).then(_instances => {
	instances.value = _instances;
});
</script>

<style lang="scss" scoped>
.rsqzvsbo {
	> .shape1 {
		position: fixed;
		top: 0;
		left: 0;
		width: 100dvw;
		height: 100dvh;
		background: var(--accent);
		clip-path: polygon(0% 0%, 45% 0%, 20% 100%, 0% 100%);
	}

	> .shape2 {
		position: fixed;
		top: 0;
		left: 0;
		width: 100dvw;
		height: 100dvh;
		background: var(--accent);
		clip-path: polygon(0% 0%, 25% 0%, 35% 100%, 0% 100%);
		opacity: 0.5;
	}

	> .misskey {
		position: fixed;
		top: 42px;
		left: 42px;
		width: 140px;
	}

	> .emojis {
		position: fixed;
		bottom: 32px;
		left: 35px;

		> * {
			margin-right: 8px;
		}
	}

	> .contents {
		position: relative;
		width: min(430px, calc(100% - 32px));
		margin-inline: auto;
		padding-block: 100px;
	}
}
</style>
