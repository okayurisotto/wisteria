<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><XHeader/></template>
	<MkSpacer :contentMax="700">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkFolder>
					<template #icon><i class="ti ti-shield"></i></template>
					<template #label>{{ i18n.ts.botProtection }}</template>
					<template v-if="enableHcaptcha" #suffix>hCaptcha</template>
					<template v-else-if="enableMcaptcha" #suffix>mCaptcha</template>
					<template v-else-if="enableRecaptcha" #suffix>reCAPTCHA</template>
					<template v-else-if="enableTurnstile" #suffix>Turnstile</template>
					<template v-else #suffix>{{ i18n.ts.none }} ({{ i18n.ts.notRecommended }})</template>

					<XBotProtection/>
				</MkFolder>

				<MkFolder>
					<template #label>Log IP address</template>
					<template v-if="enableIpLogging" #suffix>Enabled</template>
					<template v-else #suffix>Disabled</template>

					<div class="_gaps_m">
						<MkSwitch v-model="enableIpLogging" @update:modelValue="save">
							<template #label>Enable</template>
						</MkSwitch>
					</div>
				</MkFolder>

				<MkFolder>
					<template #label>Summaly Proxy</template>

					<div class="_gaps_m">
						<MkInput v-model="summalyProxy">
							<template #prefix><i class="ti ti-link"></i></template>
							<template #label>Summaly Proxy URL</template>
						</MkInput>

						<MkButton primary @click="save"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
					</div>
				</MkFolder>
			</div>
		</FormSuspense>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import XBotProtection from './bot-protection.vue';
import XHeader from './_header_.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSuspense from '@/components/form/suspense.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

const summalyProxy = ref<string>('');
const enableHcaptcha = ref<boolean>(false);
const enableMcaptcha = ref<boolean>(false);
const enableRecaptcha = ref<boolean>(false);
const enableTurnstile = ref<boolean>(false);
const enableIpLogging = ref<boolean>(false);

async function init() {
	const meta = await misskeyApi('admin/meta');
	summalyProxy.value = meta.summalyProxy;
	enableHcaptcha.value = meta.enableHcaptcha;
	enableMcaptcha.value = meta.enableMcaptcha;
	enableRecaptcha.value = meta.enableRecaptcha;
	enableTurnstile.value = meta.enableTurnstile;
	enableIpLogging.value = meta.enableIpLogging;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		summalyProxy: summalyProxy.value,
		enableIpLogging: enableIpLogging.value,
	}).then(() => {
		fetchInstance();
	});
}

definePageMetadata(() => ({
	title: i18n.ts.security,
	icon: 'ti ti-lock',
}));
</script>
