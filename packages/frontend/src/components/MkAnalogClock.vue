<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<svg :class="$style.root" viewBox="0 0 10 10" preserveAspectRatio="none">
	<template v-if="props.graduations === 'dots'">
		<circle
			v-for="(turn, i) in graduationsMajor"
			:cx="5 + (Math.sin(2 * Math.PI * turn) * (5 - graduationsPadding))"
			:cy="5 - (Math.cos(2 * Math.PI * turn) * (5 - graduationsPadding))"
			:r="0.125"
			:fill="(props.twentyfour ? h : h % 12) === i ? nowColor : gradient"
			:opacity="!props.fadeGraduations || (props.twentyfour ? h : h % 12) === i ? 1 : Math.max(0, 1 - 2 * turnDiff(hTurn, turn) - numbersOpacityFactor)"
		/>
	</template>
	<template v-else-if="props.graduations === 'numbers'">
		<text
			v-for="(turn, i) in texts"
			:x="5 + (Math.sin(2 * Math.PI * turn) * (5 - textsPadding))"
			:y="5 - (Math.cos(2 * Math.PI * turn) * (5 - textsPadding))"
			text-anchor="middle"
			dominant-baseline="middle"
			:font-size="(props.twentyfour ? h : h % 12) === i ? 1 : 0.7"
			:font-weight="(props.twentyfour ? h : h % 12) === i ? 'bold' : 'normal'"
			:fill="(props.twentyfour ? h : h % 12) === i ? nowColor : 'currentColor'"
			:opacity="!props.fadeGraduations || (props.twentyfour ? h : h % 12) === i ? 1 : Math.max(0, 1 - 2 * turnDiff(hTurn, turn) - numbersOpacityFactor)"
		>
			{{ i === 0 ? (props.twentyfour ? '24' : '12') : i }}
		</text>
	</template>

	<line
		ref="sLine"
		:class="[$style.line, { [$style.animate]: !disableSAnimate && sAnimation !== 'none', [$style.elastic]: sAnimation === 'elastic', [$style.easeOut]: sAnimation === 'easeOut' }]"
		:x1="5"
		:y1="5 + (sHandLengthRatio * handsTailLength)"
		:x2="5"
		:y2="5 - ((sHandLengthRatio * 5) - handsPadding)"
		:stroke="sHandColor"
		:stroke-width="thickness / 2"
		:style="`rotate: z ${sTurn}turn`"
		stroke-linecap="round"
	/>

	<line
		:class="[$style.line]"
		:x1="5"
		:y1="5 + (mHandLengthRatio * handsTailLength)"
		:x2="5"
		:y2="5 - ((mHandLengthRatio * 5) - handsPadding)"
		:stroke="mHandColor"
		:stroke-width="thickness"
		:style="`rotate: z ${mTurn}turn`"
		stroke-linecap="round"
	/>

	<line
		:class="[$style.line]"
		:x1="5"
		:y1="5 + (hHandLengthRatio * handsTailLength)"
		:x2="5"
		:y2="5 - ((hHandLengthRatio * 5) - handsPadding)"
		:stroke="hHandColor"
		:stroke-width="thickness"
		:style="`rotate: z ${hTurn}turn`"
		stroke-linecap="round"
	/>
</svg>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { colorScheme } from '@/themes/colorScheme';

// https://stackoverflow.com/questions/1878907/how-can-i-find-the-difference-between-two-angles
const turnDiff = (a: number, b: number) => {
	const x = Math.abs(a - b);
	return Math.abs((x + 0.5) % 1 - 0.5);
};

const graduationsPadding = 0.5;
const textsPadding = 0.6;
const handsPadding = 1;
const handsTailLength = 0.7;
const hHandLengthRatio = 0.75;
const mHandLengthRatio = 1;
const sHandLengthRatio = 1;
const numbersOpacityFactor = 0.35;

const props = withDefaults(defineProps<{
	thickness?: number;
	offset?: number;
	twentyfour?: boolean;
	graduations?: 'none' | 'dots' | 'numbers';
	fadeGraduations?: boolean;
	sAnimation?: 'none' | 'elastic' | 'easeOut';
	now?: () => Date;
}>(), {
	numbers: false,
	thickness: 0.1,
	offset: 0 - new Date().getTimezoneOffset(),
	twentyfour: false,
	graduations: 'dots',
	fadeGraduations: true,
	sAnimation: 'elastic',
	now: () => new Date(),
});

const graduationsMajor = computed(() => {
	const times = props.twentyfour ? 24 : 12;
	return Array.from({ length: times }, (_, i) => i / times);
});
const texts = computed(() => {
	const times = props.twentyfour ? 24 : 12;
	return Array.from({ length: times }, (_, i) => i / times);
});

const gradient = computed(() => colorScheme.value === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)');
const sHandColor = computed(() => colorScheme.value === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)');
const mHandColor = 'var(--fg)';
const hHandColor = 'var(--accent)';
const nowColor = 'var(--accent)';
const h = ref<number>(0);
const hTurn = ref<number>(0);
const mTurn = ref<number>(0);
const sTurn = ref<number>(0);
const disableSAnimate = ref(false);
const sLine = ref<SVGPathElement>();
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * このアナログ時計では、「基準日時から現在日時が何秒進んでいるか」をもとに時計の針の角度を求める。
 * そして針は求められた角度だけ、CSSによってz軸を基準に回転される。
 * このとき、針が進むときのCSSアニメーションをうまく動かすため、角度の最大値は設けていない。
 * （例えばもし最大値を1turnとして角度を正規化していたら、59秒から0秒へ進むときに針が逆回転してしまう。）
 * しかし角度をある範囲に正規化しないとなると、あまりにも大きすぎる角度が使われることが起きかねない。
 * そしてそのような極端な角度はWebブラウザでの描画処理で問題を起こすことがある。
 * よって、角度が極端な値にならないように、そもそもの基準日時を現在日時に近づけておく必要がある。
 * （愚直にUnixエポックを使うことはできない。）
 * よってここでは基準日時として「このコンポーネントがマウントされた日時」を使っている。
 * （もしこのコンポーネントがマウントされてから1ヶ月以上経過したら、環境によってはアニメーションがバグるまでに角度が大きくなるが、流石にそれは仕方ない。）
 */
let base = new Date();
base.setMinutes(base.getMinutes() + base.getTimezoneOffset() + props.offset);

watch(() => props.offset, () => {
	base = new Date();
	base.setMinutes(base.getMinutes() + base.getTimezoneOffset() + props.offset);
});

function tick() {
	const now = props.now();
	now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + props.offset);

	const elapsedSeconds = Math.round((now.getTime() - base.getTime()) / 1000);

	h.value = now.getHours();

	sTurn.value = (base.getSeconds() + elapsedSeconds) / 60;
	mTurn.value = (base.getMinutes() + sTurn.value) / 60;
	hTurn.value = (base.getHours() + mTurn.value) / (props.twentyfour ? 24 : 12);
}

onMounted(() => {
	tick();
	timer = setInterval(tick, 1000);
});

onBeforeUnmount(() => {
	if (timer !== null) clearInterval(timer);
});
</script>

<style lang="scss" module>
.root {
	display: block;
}

.line {
	will-change: rotate;
	transform-origin: 50% 50%;

	&.animate.elastic {
		transition: rotate .2s cubic-bezier(.4,2.08,.55,.44);
	}

	&.animate.easeOut {
		transition: rotate .7s cubic-bezier(0,.7,.3,1);
	}
}
</style>
