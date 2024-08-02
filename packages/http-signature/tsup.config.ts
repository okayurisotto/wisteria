import { defineConfig } from 'tsup';

export default defineConfig({
	// TODO: 現状型エラーが多すぎて失敗するのでtscを使っている
	// dts: true,

	entry: ['./lib/index.ts'],
	format: 'esm',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
