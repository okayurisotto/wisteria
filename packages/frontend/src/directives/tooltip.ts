/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// TODO: useTooltip関数使うようにしたい
// ただディレクティブ内でonUnmountedなどのcomposition api使えるのか不明

import { defineAsyncComponent, type Directive, ref } from 'vue';
import { isTouchUsing } from '@/scripts/touch.js';
import { popup, alert } from '@/os.js';

const start = isTouchUsing ? 'touchstart' : 'mouseenter';
const end = isTouchUsing ? 'touchend' : 'mouseleave';

export default {
	mounted(el: HTMLElement, binding) {
		const modifiers = {
			noDelay: binding.modifiers['noDelay'] ?? false,
			mfm: binding.modifiers['mfm'] ?? false,
			left: binding.modifiers['left'] ?? false,
			right: binding.modifiers['right'] ?? false,
			top: binding.modifiers['top'] ?? false,
			bottom: binding.modifiers['bottom'] ?? false,
		};

		const delay = modifiers.noDelay ? 0 : 100;
		const direction =
			modifiers.left ? 'left' :
			modifiers.right ? 'right' :
			modifiers.top ? 'top' :
			modifiers.bottom ? 'bottom' :
			'top';

		type Self = {
			text: string;
			_close: (() => void) | undefined;
			showTimer: number | undefined;
			hideTimer: number | undefined;
			checkTimer: number | undefined;
			close: () => void;
			show: () => void;
		};

		const self: Self = {
			text: binding.value,
			_close: undefined,
			showTimer: undefined,
			hideTimer: undefined,
			checkTimer: undefined,
			close() {
				if (self._close) {
					window.clearInterval(self.checkTimer);
					self._close();
					self._close = undefined;
				}
			},
			show() {
				if (!document.body.contains(el)) return;
				if (self._close) return;
				if (self.text == null) return;

				const showing = ref(true);
				popup(defineAsyncComponent(() => import('@/components/MkTooltip.vue')), {
					showing: showing, // TODO: 型エラー解消
					text: self.text,
					asMfm: modifiers.mfm,
					direction: direction,
					targetElement: el,
				}, {}, 'closed');

				self._close = () => {
					showing.value = false;
				};
			},
		};

		if (binding.arg === 'dialog') {
			el.addEventListener('click', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				alert({
					type: 'info',
					text: binding.value,
				});
				return false;
			});
		}

		el.addEventListener('selectstart', ev => {
			ev.preventDefault();
		});

		el.addEventListener(start, () => {
			window.clearTimeout(self.showTimer);
			window.clearTimeout(self.hideTimer);
			if (delay === 0) {
				self.show();
			} else {
				self.showTimer = window.setTimeout(self.show, delay);
			}
		}, { passive: true });

		el.addEventListener(end, () => {
			window.clearTimeout(self.showTimer);
			window.clearTimeout(self.hideTimer);
			self.hideTimer = window.setTimeout(self.close, delay);
		}, { passive: true });

		el.addEventListener('click', () => {
			window.clearTimeout(self.showTimer);
			self.close();
		});

		el._tooltipDirective_ = self;
	},

	updated(el, binding) {
		const self = el._tooltipDirective_;
		self.text = binding.value as string;
	},

	unmounted(el) {
		const self = el._tooltipDirective_;
		window.clearInterval(self.checkTimer);
	},
} satisfies Directive;
