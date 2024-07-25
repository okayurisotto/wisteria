import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./src/index.ts'],
	dts: process.env.NODE_ENV !== 'production',
	format: 'esm',
	minify: true,
	outDir: 'built',
	platform: 'browser',
	target: 'es2022',
});
