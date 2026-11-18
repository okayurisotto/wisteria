import { defineConfig } from 'tsdown';

export default defineConfig({
	platform: 'neutral',

	entry: [
		'src/index.ts',
	],
	outDir: 'built',

	format: 'esm',
	minify: true,
	fixedExtension: false,
	tsconfig: 'tsconfig.app.json',
});
