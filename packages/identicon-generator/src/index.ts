import { createCanvas } from '@napi-rs/canvas';
import createRandom from 'random-seed';

const COLORS = [
	['#FF512F', '#DD2476'],
	['#FF61D2', '#FE9090'],
	['#72FFB6', '#10D164'],
	['#FD8451', '#FFBD6F'],
	['#305170', '#6DFC6B'],
	['#00C0FF', '#4218B8'],
	['#009245', '#FCEE21'],
	['#0100EC', '#FB36F4'],
	['#FDABDD', '#374A5A'],
	['#38A2D7', '#561139'],
	['#121C84', '#8278DA'],
	['#5761B2', '#1FC5A8'],
	['#FFDB01', '#0E197D'],
	['#FF3E9D', '#0E1F40'],
	['#766eff', '#00d4ff'],
	['#9bff6e', '#00d4ff'],
	['#ff6e94', '#00d4ff'],
	['#ffa96e', '#00d4ff'],
	['#ffa96e', '#ff009d'],
	['#ffdd6e', '#ff009d'],
] as const satisfies [string, string][];

export const generate = (
	seed: string,
	opts: { cellSize: number; pixels: number; margin: number },
): Promise<Buffer> => {
	const imageSize = opts.pixels * opts.cellSize + opts.margin * 2;
	const sideN = Math.floor(opts.pixels / 2);

	const random = createRandom.create(seed);
	const canvas = createCanvas(imageSize, imageSize);
	const context = canvas.getContext('2d');

	const bgColors = COLORS[random(COLORS.length)]!;

	const bg = context.createLinearGradient(0, 0, imageSize, imageSize);
	bg.addColorStop(0, bgColors[0]);
	bg.addColorStop(1, bgColors[1]);

	context.fillStyle = bg;
	context.fillRect(0, 0, imageSize, imageSize);

	context.fillStyle = '#ffffff';

	/** side bitmap */
	const side = [...new Array(sideN * opts.pixels)].map(() => random(3) === 0);

	/** center bitmap */
	const center = [...new Array(opts.pixels)].map(() => random(3) === 0);

	// Draw
	for (let i = 0; i < opts.pixels ** 2; i++) {
		let x = i % opts.pixels;
		let y = Math.floor(i / opts.pixels);

		const isXCenter = x === sideN;
		if (isXCenter && !center[y]) continue;

		const isLeftSide = x < sideN;
		if (isLeftSide && !side[opts.pixels * x + y]) continue;

		const isRightSide = x > sideN;
		if (isRightSide && !side[opts.pixels * (-x + 2 * sideN) + y]) continue;

		const actualX = opts.margin + opts.cellSize * x;
		const actualY = opts.margin + opts.cellSize * y;

		context.beginPath();
		context.fillRect(actualX, actualY, opts.cellSize, opts.cellSize);
	}

	return canvas.encode('png');
};
