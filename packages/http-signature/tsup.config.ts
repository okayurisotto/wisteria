import { defineConfig } from 'tsup';

export default defineConfig({
	dts: process.env.NODE_ENV !== 'production',
	entry: ['./lib/index.ts'],
	format: 'esm',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
