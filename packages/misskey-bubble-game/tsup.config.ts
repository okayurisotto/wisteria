import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./src/index.ts'],
	dts: true,
	format: 'esm',
	minify: true,
	outDir: 'built',
	platform: 'browser',
	target: 'es2022',
});
