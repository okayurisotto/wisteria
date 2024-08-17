/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { ref } from 'vue';
import { apiUrl } from '@/config.js';
import { $i } from '@/account.js';
export const pendingApiRequestsCount = ref(0);

const apiClient = new Misskey.api.APIClient({
	origin: new URL(apiUrl).origin,
	credential: $i?.token,
	fetch: (...args) => {
		pendingApiRequestsCount.value++
		return fetch(...args).finally(() => {
			pendingApiRequestsCount.value--;
		});
	},
});

export const misskeyApi = apiClient.request.bind(apiClient);
export const misskeyApiGet = misskeyApi;
