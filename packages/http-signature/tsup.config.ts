import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./lib/index.ts'],
	format: 'esm',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
