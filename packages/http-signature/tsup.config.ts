import { defineConfig } from 'tsup';

export default defineConfig({
	dts: process.env.NODE_ENV !== 'production',
	entry: ['./src/node.ts', './src/web.ts'],
	format: 'esm',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
