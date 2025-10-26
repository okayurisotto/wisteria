interface GetFloatingPositionOptions {
	contentSize: number;
	contentAlignment: 'negative' | 'center' | 'positive';
	viewportSize: number;
	viewportMargin: number;
	target: number;
	targetSize: number;

	/** @default "normal" */
	mode?: 'normal' | 'overlap';

	/** @default true */
	clipBasedOnTarget?: boolean;
}

interface FloatingPosition {
	value: number;
	maxLength: number;
}

export const getFloatingPosition = (opts: GetFloatingPositionOptions): FloatingPosition => {
	const mode = opts.mode ?? 'normal';
	const clipBasedOnTarget = opts.clipBasedOnTarget ?? true;

	const value = (() => {
		const getPos = {
			negative: () =>
				mode === 'normal'
					? opts.target - opts.contentSize * 1.0 + opts.targetSize * 0.0
					: mode === 'overlap'
						? opts.target - opts.contentSize * 1.0 + opts.targetSize * 1.0
						: mode satisfies never,
			center: () => opts.target - opts.contentSize * 0.5 + opts.targetSize * 0.5,
			positive: () =>
				mode === 'normal'
					? opts.target - opts.contentSize * 0.0 + opts.targetSize * 1.0
					: mode === 'overlap'
						? opts.target - opts.contentSize * 0.0 + opts.targetSize * 0.0
						: mode satisfies never,
		};

		const value = getPos[opts.contentAlignment]();

		/*
		 * <-------- A -------->
		 * <- B -><- C -><- D ->
		 */
		const A = opts.viewportSize;
		const B = opts.target;
		const C = opts.targetSize;
		const D = A - B - C;

		const min = opts.viewportMargin;
		const max = opts.viewportSize - opts.viewportMargin - opts.contentSize;

		const overflowNegative = value < min;
		const overflowPositive = value > max;

		if (opts.contentAlignment === 'center') {
			return Math.max(min, Math.min(value, max));
		}

		// 左にはみ出したとき、それが左寄せのせいだと考えられるなら（右に余白があるなら）、右寄せにする
		if (overflowNegative && opts.contentAlignment === 'negative' && B < D) {
			return Math.max(min, getPos.positive());
		}

		// 右にはみ出したとき、それが右寄せのせいだと考えられるなら（左に余白があるなら）、左寄せにする
		if (overflowPositive && opts.contentAlignment === 'positive' && B > D) {
			return Math.max(min, getPos.negative());
		}

		return Math.max(min, value);
	})();

	const maxLength = (() => {
		if (opts.contentAlignment === 'center') {
			return opts.viewportSize - opts.viewportMargin * 2;
		}

		const overlap = opts.mode === 'overlap' ? opts.targetSize : 0;

		if (value < opts.target) {
			// 最終的に左側に配置された場合
			if (clipBasedOnTarget) {
				return opts.target - opts.viewportMargin + overlap;
			} else {
				return opts.viewportSize - opts.viewportMargin * 2 + overlap;
			}
		} else {
			// 最終的に右側に配置された場合
			return opts.viewportSize - opts.target - opts.targetSize - opts.viewportMargin + overlap;
		}
	})();

	return { value, maxLength };
};
