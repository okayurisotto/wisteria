interface GetFloatingPositionOptions {
  contentSize: number;
  contentAlignment: 'negative' | 'center' | 'positive';
  viewportSize: number;
  viewportMargin: number;
  target: number;
  targetSize: number;
}

export const getFloatingPosition = (opts: GetFloatingPositionOptions) => {
  const value = (() => {
    const value = ({
      negative: opts.target - opts.contentSize * 1.0 + opts.targetSize * 0.0,
      center:   opts.target - opts.contentSize * 0.5 + opts.targetSize * 0.5,
      positive: opts.target - opts.contentSize * 0.0 + opts.targetSize * 1.0,
    })[opts.contentAlignment];

		/*
		 * <-------- A -------->
		 * <- B -><- C -><- D ->
		 */
    const A = opts.viewportSize;
    const B = opts.target;
    const C = opts.targetSize;
    const D = A - B - C;

    const x_min = opts.viewportMargin;
    const x_max = opts.viewportSize - opts.viewportMargin - opts.contentSize;

    const underflow = value < x_min;
    const overflow = value > x_max;

    if (opts.contentAlignment === 'center') {
      return Math.max(x_min, Math.min(value, x_max));
    }

    // 左にはみ出したとき、それが左寄せのせいだと考えられるなら（右に余白があるなら）、右寄せにする
    if (underflow && opts.contentAlignment === 'negative' && B < D) {
      return Math.max(x_min, opts.target - opts.contentSize * 0.0 + opts.targetSize * 1.0);
    }

    // 右にはみ出したとき、それが右寄せのせいだと考えられるなら（左に余白があるなら）、左寄せにする
    if (overflow && opts.contentAlignment === 'positive' && B > D) {
      return Math.max(x_min, opts.target - opts.contentSize * 1.0 + opts.targetSize * 0.0);
    }

    return Math.max(x_min, value);
  })();

  const maxLength = (() => {
    if (opts.contentAlignment === 'center') {
      return opts.viewportSize - opts.viewportMargin * 2;
    }

    if (value < opts.target) {
      // 最終的に左側に配置された場合
      return opts.target - opts.viewportMargin;
    } else {
      // 最終的に右側に配置された場合
      return opts.viewportSize - opts.target - opts.targetSize - opts.viewportMargin;
    }
  })();

  return { value, maxLength };
};
