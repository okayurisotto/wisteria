<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m rsljpzjq">
	<div class="rfqxtzch _panel">
		<label>
			<input type="radio" name="colorSchemeSelection" :checked="selectedColorScheme === undefined" @click="selectedColorScheme = undefined" />
			デバイスと同期
		</label>
		<label>
			<input type="radio" name="colorSchemeSelection" :checked="selectedColorScheme !== undefined && colorScheme === 'light'" @click="selectedColorScheme = 'light'" />
			ライトモード
		</label>
		<label>
			<input type="radio" name="colorSchemeSelection" :checked="selectedColorScheme !== undefined && colorScheme === 'dark'" @click="selectedColorScheme = 'dark'" />
			ダークモード
		</label>
	</div>

	<div class="selects">
		<MkSelect v-model="lightThemeId" large class="select">
			<template #label>{{ i18n.ts.themeForLightMode }}</template>
			<template #prefix><i class="ti ti-sun"></i></template>
			<option v-if="instanceLightTheme" :key="'instance:' + instanceLightTheme.id" :value="instanceLightTheme.id">{{ instanceLightTheme.name }}</option>
			<optgroup v-if="installedLightThemes.length > 0" :label="i18n.ts._theme.installedThemes">
				<option v-for="x in installedLightThemes" :key="'installed:' + x.id" :value="x.id">{{ x.name }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._theme.builtinThemes">
				<option v-for="x in builtinLightThemes" :key="'builtin:' + x.id" :value="x.id">{{ x.name }}</option>
			</optgroup>
		</MkSelect>
		<MkSelect v-model="darkThemeId" large class="select">
			<template #label>{{ i18n.ts.themeForDarkMode }}</template>
			<template #prefix><i class="ti ti-moon"></i></template>
			<option v-if="instanceDarkTheme" :key="'instance:' + instanceDarkTheme.id" :value="instanceDarkTheme.id">{{ instanceDarkTheme.name }}</option>
			<optgroup v-if="installedDarkThemes.length > 0" :label="i18n.ts._theme.installedThemes">
				<option v-for="x in installedDarkThemes" :key="'installed:' + x.id" :value="x.id">{{ x.name }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._theme.builtinThemes">
				<option v-for="x in builtinDarkThemes" :key="'builtin:' + x.id" :value="x.id">{{ x.name }}</option>
			</optgroup>
		</MkSelect>
	</div>

	<FormSection>
		<div class="_formLinksGrid">
			<FormLink to="/settings/theme/manage"><template #icon><i class="ti ti-tool"></i></template>{{ i18n.ts._theme.manage }}<template #suffix>{{ themesCount }}</template></FormLink>
			<FormLink to="/settings/theme/install"><template #icon><i class="ti ti-download"></i></template>{{ i18n.ts._theme.install }}</FormLink>
		</div>
	</FormSection>

	<MkButton v-if="wallpaper == null" @click="setWallpaper">{{ i18n.ts.setWallpaper }}</MkButton>
	<MkButton v-else @click="wallpaper = null">{{ i18n.ts.removeWallpaper }}</MkButton>
</div>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue';
import MkSelect from '@/components/MkSelect.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkButton from '@/components/MkButton.vue';
import { builtinDarkThemes, builtinLightThemes, installedDarkThemes, installedLightThemes, installedThemes, instanceDarkTheme, instanceLightTheme, primaryDarkTheme, primaryLightTheme, selectedDarkThemeId, selectedLightThemeId } from '@/themes/theme';
import { selectFile } from '@/scripts/select-file.js';
import { i18n } from '@/i18n.js';
import { fetchThemes, getThemes } from '@/themes/store.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { miLocalStorage } from '@/local-storage.js';
import { unisonReload } from '@/scripts/unison-reload.js';
import * as os from '@/os.js';
import { colorScheme, selectedColorScheme } from '@/themes/colorScheme';

async function reloadAsk() {
	const { canceled } = await os.confirm({
		type: 'info',
		text: i18n.ts.reloadToApplySetting,
	});
	if (canceled) return;

	unisonReload();
}

const darkThemeId = computed({
	get() {
		return primaryDarkTheme.value.id;
	},
	set(id) {
		selectedDarkThemeId.value = id;
	},
});

const lightThemeId = computed({
	get() {
		return primaryLightTheme.value.id;
	},
	set(id) {
		selectedLightThemeId.value = id;
	},
});

const wallpaper = ref(miLocalStorage.getItem('wallpaper'));
const themesCount = installedThemes.value.length;

watch(wallpaper, () => {
	if (wallpaper.value == null) {
		miLocalStorage.removeItem('wallpaper');
	} else {
		miLocalStorage.setItem('wallpaper', wallpaper.value);
	}
	reloadAsk();
});

onActivated(() => {
	fetchThemes().then(() => {
		installedThemes.value = getThemes();
	});
});

fetchThemes().then(() => {
	installedThemes.value = getThemes();
});

function setWallpaper(event) {
	selectFile(event.currentTarget ?? event.target, null).then(file => {
		wallpaper.value = file.url;
	});
}

definePageMetadata(() => ({
	title: i18n.ts.theme,
	icon: 'ti ti-palette',
}));
</script>

<style lang="scss" scoped>
.rfqxtzch {
	border-radius: var(--rounded);
	display: flex;
	flex-direction: column;
	gap: var(--margin);
	padding: var(--margin);
}

.rsljpzjq {
	> .selects {
		display: flex;
		gap: 1.5em var(--margin);
		flex-wrap: wrap;

		> .select {
			flex: 1;
			min-width: 280px;
		}
	}
}
</style>
