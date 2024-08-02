import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./lib/index.ts'],
	format: 'cjs',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
