<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<MkPullToRefresh :refresher="reload">
		<div ref="list" :class="$style.root" v-if="filteredItems.length !== 0">
			<div ref="topMarker"></div>
			<div :class="[$style.item, { [$style.firstItem]: i === 0 }]" v-for="[i, item] in enumerate(filteredItems)">
				<MkNote v-if="['reply', 'quote', 'mention'].includes(item.type)" :key="item.id + ':note'" :note="item.note" :withHardMute="true"/>
				<MkNotification v-else :key="item.id" :notification="item" :withTime="true" :full="true" class="_panel"/>
			</div>
			<div ref="bottomMarker"></div>
		</div>
		<div v-else class="_fullinfo">
			<img :src="infoImageUrl" class="_ghost"/>
			<div>{{ i18n.ts.noNotifications }}</div>
		</div>
	</MkPullToRefresh>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, ref, computed, useTemplateRef, nextTick } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import type * as MisskeyJS from 'misskey-js';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import MkNote from '@/components/MkNote.vue';
import MkNotification from '@/components/MkNotification.vue';
import { i18n } from '@/i18n.js';
import { infoImageUrl } from '@/instance.js';
import { notificationTypes } from '@/const.js';
import { useStream } from '@/stream.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { defaultStore } from '@/store.js';

function* enumerate<T>(items: Iterable<T>): Generator<[index: number, item: T]> {
	let index = 0;
	for (const item of items) {
		yield [index, item];
		index++;
	}
};

const props = defineProps<{
	excludeTypes?: typeof notificationTypes[number][];
}>();

const items = ref<MisskeyJS.entities.Notification[]>([]);
const queue = ref<MisskeyJS.entities.Notification[]>([]);
const isTop = ref(true);
const list = useTemplateRef('list');
const topMarker = useTemplateRef('topMarker');
const bottomMarker = useTemplateRef('bottomMarker');

const oldestItemId = computed(() => items.value[items.value.length - 1]?.id);

const filteredItems = computed<MisskeyJS.entities.Notification[]>(() => {
	return items.value.filter((item) => {
		if (props.excludeTypes === undefined || props.excludeTypes.length === 0) {
			return true;
		} else {
			if (item.type === 'test') {
				return false;
			} else {
				return !props.excludeTypes.includes(item.type);
			}
		}
	});
});

const reload = async () => {
	items.value = await misskeyApi('i/notifications', { limit: 20 });
};

let connection: MisskeyJS.ChannelConnection<MisskeyJS.Channels['main']> | null = null;

const smoothUnshift = () => {
	if (list.value === null) return;
	if (topMarker.value === null) return;

	const topItem = topMarker.value.nextElementSibling;
	if (topItem === null) return;

	const topNoteHeight = Math.round(topItem.getBoundingClientRect().height);

	list.value.animate(
		[
			{ translate: `0 ${-topNoteHeight}px` },
			{ translate: '0 0' },
		],
		{ easing: 'cubic-bezier(0.23, 1, 0.32, 1)', duration: 700 }
	);
};

useIntersectionObserver([topMarker, bottomMarker], async (entries) => {
	for (const entry of entries) {
		if (entry.target === topMarker.value) {
			isTop.value = entry.isIntersecting;

			if (queue.value.length !== 0) {
				// TODO: スクロール量の調整
				// `queue`の中身を一気に`items`に開放してしまうと、その分先程まで一番上にあった通知が下の方へ押しやられてしまう。
				// `pages/timeline.vue`では、Webブラウザの機能がうまくハンドリングしてくれていた。
				// （おそらく`topMarker`が見えているからといってスクロールコンテナの一番上までスクロールされたわけではなったため。）
				// しかしこの通知一覧コンポーネントではそうはいかない。
				// 祖先のスクロールコンテナを探して`.scrollBy({ top: value, behavior: 'instant' })`するしかない？
				// （そもそもスクロールコンテナではないコンポーネントで`topMarker`や`bottomMarker`を使ってスクロール量のハンドリングをしているのがよくないと言われれば、それはそう。）

				// items.value = [...queue.value, ...items.value];
				// queue.value = [];
			}
		}

		if (entry.target === bottomMarker.value) {
			if (entry.isIntersecting) {
				if (oldestItemId.value !== undefined) {
					const prevItems = await misskeyApi('i/notifications', { limit: 20, untilId: oldestItemId.value });
					items.value = [...items.value, ...prevItems];
				}
			}
		}
	}
});

onMounted(async () => {
	items.value = await misskeyApi('i/notifications', {
		limit: 20,
	});

	connection = useStream().useChannel('main');

	connection.on('notification', (item) => {
		if (isTop.value) {
			items.value.unshift(item);

			if (defaultStore.state.animation) {
				// TODO: まれにバグるのでうまくハンドリングする。
				// `items`にunshiftした新着通知が`excludeTypes`に該当していた場合、`filteredItems`には変化がない。
				// にも関わらず以下のコードが実行されてしまうと、新着でもないのに通知欄がアニメーションしてしまう。
				// `excludeTypes`に該当するかどうかの条件分岐を追加するしかない？
				// （同等の処理が分散してしまうのであまりやりたくはないが。）

				// nextTick(smoothUnshift);
			}
		} else {
			items.value.unshift(item);

			// queue.value.unshift(item);
		}
	});
});

onUnmounted(() => {
	if (connection !== null) {
		connection.dispose();
	}
});
</script>

<style lang="scss" module>
.root {
	background: var(--panel);
	font-size: 0.9em;
	display: flex;
	flex-direction: column;
	gap: var(--margin-full);
}

.item:not(.firstItem) {
	border-block-start: 0.5px solid var(--divider);
}
</style>
