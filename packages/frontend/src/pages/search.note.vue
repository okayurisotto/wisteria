<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div class="_gaps">
		<MkInput v-model="queryRaw" :large="true" :autofocus="true" type="search" @enter="search">
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>
		<MkFolder>
			<template #label>{{ i18n.ts.options }}</template>

			<div class="_gaps_m">
				<MkSwitch v-model="isLocalOnly">{{ i18n.ts.localOnly }}</MkSwitch>

				<MkFolder :defaultOpen="true">
					<template #label>{{ i18n.ts.specifyUser }}</template>
					<template v-if="user" #suffix>@{{ user.username }}</template>

					<div style="text-align: center;" class="_gaps">
						<div v-if="user">@{{ user.username }}</div>
						<div>
							<MkButton v-if="user == null" primary rounded inline @click="selectUser">{{ i18n.ts.selectUser }}</MkButton>
							<MkButton v-else danger rounded inline @click="user = null">{{ i18n.ts.remove }}</MkButton>
						</div>
					</div>
				</MkFolder>
			</div>
		</MkFolder>
		<div>
			<MkButton large primary gradate rounded style="margin: 0 auto;" @click="search">{{ i18n.ts.search }}</MkButton>
		</div>
	</div>

	<MkFoldableSection v-if="notePagination">
		<template #header>{{ i18n.ts.searchResult }}</template>
		<MkNotes :key="key" :pagination="notePagination"/>
	</MkFoldableSection>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type * as Misskey from 'misskey-js';
import MkNotes from '@/components/MkNotes.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkFolder from '@/components/MkFolder.vue';

const key = ref(0);
const queryRaw = ref('');
const notePagination = ref();
const user = ref<Misskey.entities.UserLite | null>(null);
const isLocalOnly = ref(false);

const query = computed(() => {
	const query = queryRaw.value.trim();
	if (query === '') return null;
	return query;
});

onMounted(() => {
	const searchParam = new URL(location.href).searchParams.get('q');
	if (searchParam === null) return;

	queryRaw.value = searchParam;
	search();
});

const selectUser = async () => {
	user.value = await os.selectUser({ includeSelf: true })
};

const updateUrl = () => {
	const url = new URL(location.href);

	if (query.value === null) {
		url.searchParams.delete('q');
	} else {
		url.searchParams.set('q', query.value);
	}

	history.pushState(null, "", url.href);
};

const search = () => {
	if (query.value === null) return;
	updateUrl();

	notePagination.value = {
		endpoint: 'notes/search',
		limit: 10,
		params: {
			query: query.value,
			userId: user.value?.id ?? null,
			...(isLocalOnly.value ? { host: '.' } : {}),
		},
	};

	key.value++;
};
</script>
