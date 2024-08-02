import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./lib/index.js'],
	format: 'cjs',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
